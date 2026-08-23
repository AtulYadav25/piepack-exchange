import { users, type Market } from './config.js'

// CONFIG

/**
 * Change this to switch which market the bot trades on.
 * Must be one of: 'BTC-USDC' | 'ETH-USDC' | 'SOL-USDC'
 */
const ACTIVE_MARKET: Market = 'BTC-USDC'

const API_URL = 'http://localhost:3000/api/v1/order/placeOrder'

// Initial seed prices per market
const INITIAL_PRICES: Record<Market, number> = {
    'BTC-USDC': 75454.14,
    'ETH-USDC': 1295.47,
    'SOL-USDC': 75.58,
}

// How far from current price orders can be placed (as a fraction)
const PRICE_SPREAD = 0.002       // ±0.2% around current price

// Quantity ranges per market
const QTY_CONFIG: Record<Market, { min: number; max: number; decimals: number }> = {
    'BTC-USDC': { min: 0.001, max: 0.02, decimals: 4 },
    'ETH-USDC': { min: 0.01, max: 0.5, decimals: 3 },
    'SOL-USDC': { min: 0.1, max: 5, decimals: 2 },
}

// Sentiment phase durations (ms): how long before the bias flips
const PHASE_MIN_MS = 20_000   //  8 seconds minimum per phase
const PHASE_MAX_MS = 40_000  // 25 seconds maximum per phase

// Order interval range (ms) — varies each tick for a natural feel
const INTERVAL_CHOICES_MS = [500, 600, 750, 800, 1000, 1100, 1200]

// STATE

let currentPrice = INITIAL_PRICES[ACTIVE_MARKET]

/**
 * Sentiment bias.
 * > 0.5 → bullish phase (more buys, price tends to drift up)
 * < 0.5 → bearish phase (more sells, price tends to drift down)
 */
let buyProbability = 0.55   // start mildly bullish
let isRunning = true

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min
}

function roundTo(value: number, decimals: number): number {
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
}

function randomIntervalMs(): number {
    return INTERVAL_CHOICES_MS[Math.floor(Math.random() * INTERVAL_CHOICES_MS.length)]!
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Pick a random user from the pool */
function randomUser() {
    return users[Math.floor(Math.random() * users.length)]!
}

/**
 * Slowly drift the price in the direction of the current sentiment.
 * The drift is tiny per tick so it feels organic.
 */
function driftPrice(side: 'buy' | 'sell'): void {
    const driftFactor = randomBetween(0.0001, 0.0005) // 0.01% to 0.05% per order
    if (side === 'buy') {
        currentPrice *= 1 + driftFactor
    } else {
        currentPrice *= 1 - driftFactor
    }
}

// ORDER PLACEMENT

async function placeOrder(side: 'buy' | 'sell'): Promise<void> {
    const user = randomUser()
    const qty = QTY_CONFIG[ACTIVE_MARKET]

    // Price: offset slightly from current price in the right direction
    const offset = randomBetween(0, PRICE_SPREAD)
    const orderPrice = side === 'buy'
        ? roundTo(currentPrice * (1 - offset), 2)   // buy slightly below
        : roundTo(currentPrice * (1 + offset), 2)   // sell slightly above

    const quantity = roundTo(randomBetween(qty.min, qty.max), qty.decimals)

    const body = {
        userId: user.userId,
        market: ACTIVE_MARKET,
        order: {
            userId: user.userId,
            market: ACTIVE_MARKET,
            side,
            type: 'limit' as const,
            price: orderPrice,
            quantity,
        },
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`,
            },
            body: JSON.stringify(body),
        })

        const status = res.ok ? '✅' : '❌'
        console.log(
            `${status} [${ACTIVE_MARKET}] ${side.toUpperCase().padEnd(4)} | ` +
            `price: ${orderPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ` +
            `qty: ${quantity} | ` +
            `user: ...${user.userId.slice(-8)}`
        )

        if (!res.ok) {
            const text = await res.text()
            console.error(`   └─ Server: ${text.slice(0, 120)}`)
        }
    } catch (err) {
        console.error(`🔴 Network error:`, (err as Error).message)
    }
}

// SENTIMENT PHASE ENGINE

/**
 * Periodically flip the market sentiment between bullish and bearish phases.
 * The phase duration is randomised so it never feels mechanical.
 */
async function runPhaseEngine(): Promise<void> {
    while (isRunning) {
        const phaseDuration = randomBetween(PHASE_MIN_MS, PHASE_MAX_MS)
        const isBullish = Math.random() > 0.5

        buyProbability = isBullish
            ? randomBetween(0.62, 0.78)   // strong buy bias
            : randomBetween(0.22, 0.38)   // strong sell bias

        console.log(
            `\n📊 Phase shift → ${isBullish ? '🟢 BULLISH' : '🔴 BEARISH'} ` +
            `(buy prob: ${(buyProbability * 100).toFixed(0)}%, ` +
            `duration: ${(phaseDuration / 1000).toFixed(1)}s)\n`
        )

        await sleep(phaseDuration)
    }
}

// ORDER LOOP

async function runOrderLoop(): Promise<void> {
    console.log(`🤖 TradeBot started on ${ACTIVE_MARKET}`)
    console.log(`   Seed price: $${currentPrice.toLocaleString()}`)
    console.log(`   Users: ${users.length}`)
    console.log(`   API: ${API_URL}\n`)

    while (isRunning) {
        const side: 'buy' | 'sell' = Math.random() < buyProbability ? 'buy' : 'sell'

        await placeOrder(side)
        driftPrice(side)

        await sleep(randomIntervalMs())
    }
}


// ENTRY POINT

// Run both loops concurrently — they don't block each other
await Promise.all([runOrderLoop(), runPhaseEngine()])