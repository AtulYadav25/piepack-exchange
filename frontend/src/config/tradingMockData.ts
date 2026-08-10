import type { UTCTimestamp } from 'lightweight-charts'

export interface CandlestickData {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookEntry {
  price: number
  size: number
  total: number
}

export interface RecentTrade {
  id: string
  price: number
  size: number
  time: string
  side: 'buy' | 'sell'
}

export interface UserOrder {
  id: string
  time: string
  pair: string
  type: 'LIMIT' | 'MARKET'
  side: 'BUY' | 'SELL'
  price: number
  amount: number
  filled: number
  status: 'OPEN' | 'FILLED' | 'CANCELLED'
}

// Map timeframe string to step seconds
function getTimeframeStepSeconds(timeframe: string): number {
  switch (timeframe) {
    case '1m':
      return 60
    case '5m':
      return 300
    case '15m':
      return 900
    case '1h':
      return 3600
    case '4h':
      return 14400
    case '1D':
      return 86400
    default:
      return 3600
  }
}

// Generate realistic candlestick data for a given market symbol and timeframe
export function generateMockCandlesticks(
  symbol: string,
  timeframe: string = '1h'
): CandlestickData[] {
  let basePrice = 64000
  if (symbol.toUpperCase().includes('ETH')) basePrice = 3450
  if (symbol.toUpperCase().includes('SOL')) basePrice = 145

  const data: CandlestickData[] = []
  const numberOfPoints = 150
  const stepSeconds = getTimeframeStepSeconds(timeframe)

  // Align starting timestamp in seconds
  const nowSeconds = Math.floor(Date.now() / 1000)
  const startTime = nowSeconds - numberOfPoints * stepSeconds

  let currentPrice = basePrice

  for (let i = 0; i < numberOfPoints; i++) {
    const timestamp = (startTime + i * stepSeconds) as UTCTimestamp

    const volatility = currentPrice * 0.015
    const change = (Math.random() - 0.48) * volatility
    const open = currentPrice
    const close = open + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    const volume = Math.floor(Math.random() * 80 + 20)

    data.push({
      time: timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    })

    currentPrice = close
  }

  return data
}

// Generate mock orderbook bids and asks
export function generateMockOrderBook(basePrice: number) {
  const asks: OrderBookEntry[] = []
  const bids: OrderBookEntry[] = []

  let askAccumulator = 0
  for (let i = 1; i <= 8; i++) {
    const price = Number((basePrice + i * (basePrice * 0.0004)).toFixed(2))
    const size = Number((Math.random() * 1.5 + 0.1).toFixed(4))
    askAccumulator += size
    asks.push({ price, size, total: Number(askAccumulator.toFixed(4)) })
  }

  // Reverse asks so highest ask is at top and lowest ask (best ask) is at bottom
  asks.reverse()

  let bidAccumulator = 0
  for (let i = 1; i <= 8; i++) {
    const price = Number((basePrice - i * (basePrice * 0.0004)).toFixed(2))
    const size = Number((Math.random() * 1.5 + 0.1).toFixed(4))
    bidAccumulator += size
    bids.push({ price, size, total: Number(bidAccumulator.toFixed(4)) })
  }

  return { asks, bids }
}

// Generate mock recent trades
export function generateMockTrades(basePrice: number): RecentTrade[] {
  const trades: RecentTrade[] = []
  const now = Date.now()

  for (let i = 0; i < 12; i++) {
    const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell'
    const delta = (Math.random() - 0.5) * (basePrice * 0.001)
    const price = Number((basePrice + delta).toFixed(2))
    const size = Number((Math.random() * 0.8 + 0.05).toFixed(4))
    const time = new Date(now - i * 15 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    trades.push({
      id: `trade-${i}`,
      price,
      size,
      time,
      side,
    })
  }

  return trades
}

// Initial mock open orders
export const MOCK_USER_ORDERS: UserOrder[] = [
  {
    id: 'ord-101',
    time: '14:32:05',
    pair: 'BTC-USDC',
    type: 'LIMIT',
    side: 'BUY',
    price: 63800.0,
    amount: 0.25,
    filled: 0,
    status: 'OPEN',
  },
  {
    id: 'ord-102',
    time: '14:15:22',
    pair: 'BTC-USDC',
    type: 'LIMIT',
    side: 'SELL',
    price: 65200.0,
    amount: 0.5,
    filled: 0.1,
    status: 'OPEN',
  },
  {
    id: 'ord-103',
    time: '12:04:10',
    pair: 'ETH-USDC',
    type: 'LIMIT',
    side: 'BUY',
    price: 3400.0,
    amount: 1.5,
    filled: 1.5,
    status: 'FILLED',
  },
]
