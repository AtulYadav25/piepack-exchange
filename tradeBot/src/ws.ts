import WebSocket from 'ws'
import type { Market } from './config.js'

// Protocol types (mirrors backend ws/types.ts)

const WS_URL = 'ws://localhost:3000'

const WS_CLIENT_EVENTS = {
    SUBSCRIBE_MARKET: 'SUBSCRIBE_MARKET',
    PING: 'PING',
} as const

const WS_SERVER_EVENTS = {
    PRICE_TICK: 'PRICE_TICK',
    PONG: 'PONG',
    ERROR: 'ERROR',
    SUBSCRIBED: 'SUBSCRIBED',
} as const

interface WsMessage<T = unknown> {
    type: string
    payload: T
    ts: number
}

interface PriceTickPayload {
    symbol: Market
    price: number
}

function buildMessage<T>(type: string, payload: T): string {
    const msg: WsMessage<T> = { type, payload, ts: Date.now() }
    return JSON.stringify(msg)
}

// WsClient

type PriceHandler = (price: number) => void

export class WsClient {
    private socket: WebSocket | null = null
    private market: Market
    private onPriceTick: PriceHandler
    private reconnectDelay = 1000   // starts at 1s, doubles up to 30s
    private stopped = false
    private pingInterval: ReturnType<typeof setInterval> | null = null

    constructor(market: Market, onPriceTick: PriceHandler) {
        this.market = market
        this.onPriceTick = onPriceTick
    }

    connect(): void {
        if (this.stopped) return

        console.log(`[WS] Connecting to ${WS_URL} ...`)
        this.socket = new WebSocket(WS_URL)

        this.socket.on('open', () => {
            console.log(`[WS] Connected. Subscribing to ${this.market}`)
            this.reconnectDelay = 1000 // reset backoff on successful connect

            // Subscribe to the market room
            this.socket!.send(
                buildMessage(WS_CLIENT_EVENTS.SUBSCRIBE_MARKET, { symbol: this.market })
            )

            // Application-level ping every 25s (server pings every 30s)
            this.pingInterval = setInterval(() => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                    this.socket.send(buildMessage(WS_CLIENT_EVENTS.PING, {}))
                }
            }, 25_000)
        })

        this.socket.on('message', (raw: Buffer) => {
            let msg: WsMessage
            try {
                msg = JSON.parse(raw.toString())
            } catch {
                return
            }

            if (msg.type === WS_SERVER_EVENTS.PRICE_TICK) {
                const { price } = msg.payload as PriceTickPayload
                this.onPriceTick(price)
            }
        })

        this.socket.on('close', () => {
            this.cleanup()
            if (!this.stopped) {
                console.log(`[WS] Disconnected. Reconnecting in ${this.reconnectDelay}ms ...`)
                setTimeout(() => this.connect(), this.reconnectDelay)
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
            }
        })

        this.socket.on('error', (err: Error) => {
            console.error(`[WS] Error: ${err.message}`)
            // 'close' fires after 'error', so reconnect is handled there
        })
    }

    disconnect(): void {
        this.stopped = true
        this.cleanup()
        this.socket?.terminate()
    }

    private cleanup(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }
    }
}