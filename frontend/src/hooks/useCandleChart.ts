import { useEffect, useRef, useState } from 'react'
import type { UTCTimestamp } from 'lightweight-charts'
import { on, send, initWsClient, onConnected } from '../ws/wsClient'
import { candleApi } from '../api/candle.api'
import type { CandleData } from '../api/candle.api'

// Shared chart candle shape

export interface ChartCandle {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Timeframe mappings

/**
 * Chart timeframe label → bucket duration in seconds.
 * Used to compute which time-bucket an incoming trade belongs to.
 */
const TIMEFRAME_STEP: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
}

/**
 * Chart timeframe label → API interval string accepted by the backend.
 * Backend maps these via parseInterval() to PostgreSQL INTERVAL literals.
 */
const TIMEFRAME_TO_INTERVAL: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
}

// Internal WS payload types (mirrors backend ws/types.ts)

interface RecentTrade {
  id: string
  market: string
  price: number
  quantity: number
  side: 'buy' | 'sell'
  executedAt: number
}

interface RecentTradesPayload {
  symbol: string
  trades: RecentTrade[]
}

// Time-bucket helper

/**
 * Returns the start-of-bucket Unix timestamp (seconds) for a given step.
 * Identical to what TimescaleDB's time_bucket() produces on the backend.
 *
 * e.g. bucketOf(1700000095, 60) → 1700000060  (start of the 1m candle)
 */
function bucketOf(unixSeconds: number, step: number): UTCTimestamp {
  return (Math.floor(unixSeconds / step) * step) as UTCTimestamp
}

// Hook return shape

export interface UseCandleChartResult {
  /** Historical candles from REST, ready for series.setData() */
  candles: ChartCandle[]
  /**
   * The live, still-open candle for the current time bucket.
   * Built from RECENT_TRADES WS events — high/low/volume are all
   * accumulated from real trade quantities, not derived from price alone.
   * Null until the first trade arrives.
   */
  liveCandle: ChartCandle | null
  isLoading: boolean
  error: string | null
}

// Hook 

export function useCandleChart(
  symbol: string,
  timeframe: string,
): UseCandleChartResult {
  const [candles, setCandles] = useState<ChartCandle[]>([])
  const [liveCandle, setLiveCandle] = useState<ChartCandle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Ref for the in-progress live candle accumulator.
   * Using a ref (not state) so the WS handler always reads the latest value
   * without being re-registered on every update — avoids stale closure bugs.
   */
  const liveCandleRef = useRef<ChartCandle | null>(null)

  // Refs so the WS handler (registered once) always reads the latest symbol/step
  const symbolRef = useRef(symbol)
  const stepRef = useRef(TIMEFRAME_STEP[timeframe] ?? 3600)

  // Keep refs in sync whenever props change
  useEffect(() => {
    symbolRef.current = symbol
    stepRef.current = TIMEFRAME_STEP[timeframe] ?? 3600
    // Reset the live accumulator — new symbol/timeframe = new context
    liveCandleRef.current = null
    setLiveCandle(null)
  }, [symbol, timeframe])

  // REST: fetch historical candles 

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)
    // Clear live accumulator while history reloads so there's no stale candle
    liveCandleRef.current = null
    setLiveCandle(null)

    const step = TIMEFRAME_STEP[timeframe] ?? 3600
    const interval = TIMEFRAME_TO_INTERVAL[timeframe] ?? '1h'

    const endTime = new Date()
    // Fetch enough candles to fill the chart (200 bars back)
    const startTime = new Date(endTime.getTime() - 200 * step * 1000)

    candleApi
      .getCandles({
        market: symbol,
        interval,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        limit: 200,
      })
      .then((res) => {
        if (cancelled) return

        /**
         * Backend returns timestamp in milliseconds (Date.getTime()).
         * lightweight-charts expects UTC seconds for the `time` field.
         */
        const mapped: ChartCandle[] = res.data.candles.map((c: CandleData) => ({
          time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }))

        setCandles(mapped)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message ?? 'Failed to load candle data')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [symbol, timeframe])

  // WS: live candle accumulation via RECENT_TRADES

  useEffect(() => {
    initWsClient()

    /**
     * Re-send SUBSCRIBE_MARKET on every (re)connection.
     *
     * Why onConnected() instead of a plain send()?
     *   send() queues the message for the current connection only.
     *   If the WebSocket drops and auto-reconnects, the sendQueue is already
     *   empty — so SUBSCRIBE_MARKET is NEVER resent, the socket is not in the
     *   market room, and RECENT_TRADES stop arriving until the page refreshes.
     *   onConnected() fires its callback on EVERY successful open (initial +
     *   reconnects), guaranteeing the subscription is always live.
     */
    const unsubConnect = onConnected(() => {
      send('SUBSCRIBE_MARKET', { symbol })
    })

    const unsub = on<RecentTradesPayload>('RECENT_TRADES', (payload) => {
      console.log(payload)
      console.log(symbolRef.current.toUpperCase());
      if (payload.symbol !== symbolRef.current.toUpperCase()) return

      const step = stepRef.current
      const currentBucket = bucketOf(Math.floor(Date.now() / 1000), step)

      for (const trade of payload.trades) {
        const prev = liveCandleRef.current

        if (!prev || prev.time !== currentBucket) {
          /**
           * Either the very first tick, or the clock has crossed into a new
           * bucket — start a fresh candle. The previous live candle is now
           * "closed" and will be embedded in the next REST fetch naturally.
           */
          const fresh: ChartCandle = {
            time: currentBucket,
            open: trade.price,
            high: trade.price,
            low: trade.price,
            close: trade.price,
            volume: trade.quantity,
          }
          liveCandleRef.current = fresh
          setLiveCandle({ ...fresh })
        } else {
          // Same bucket — extend the current candle
          const updated: ChartCandle = {
            ...prev,
            high: Math.max(prev.high, trade.price),
            low: Math.min(prev.low, trade.price),
            close: trade.price,
            volume: prev.volume + trade.quantity,
          }
          liveCandleRef.current = updated
          setLiveCandle({ ...updated })
        }
      }
    })

    // Cleanup: deregister both the connect handler and the message listener.
    // We do NOT send UNSUBSCRIBE_MARKET here — useMarketSocket owns that lifecycle.
    return () => {
      unsubConnect()
      unsub()
    }
  }, [symbol]) // re-run when symbol changes so onConnected re-registers with the new symbol closure

  return { candles, liveCandle, isLoading, error }
}
