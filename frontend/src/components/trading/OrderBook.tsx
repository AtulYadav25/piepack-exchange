import React, { useMemo } from 'react'
import type { OrderBookEntry } from '../../config/tradingMockData'

interface OrderBookProps {
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
  currentPrice: number
  quoteAsset?: string
  baseAsset?: string
}

const DEPTH_ROWS = 7

export const OrderBook: React.FC<OrderBookProps> = ({
  asks,
  bids,
  currentPrice,
  quoteAsset = 'USDC',
  baseAsset = 'BTC',
}) => {
  // Compute max totals for depth bar percentages
  const maxAskTotal = useMemo(() => {
    return asks.length > 0 ? Math.max(...asks.map((a) => a.total)) : 1
  }, [asks])

  const maxBidTotal = useMemo(() => {
    return bids.length > 0 ? Math.max(...bids.map((b) => b.total)) : 1
  }, [bids])

  const paddedAsks = useMemo(() => {
    const sliced = asks.slice(0, DEPTH_ROWS)
    const reversed = [...sliced].reverse()
    const emptyCount = DEPTH_ROWS - reversed.length
    const padding = Array<OrderBookEntry | null>(emptyCount).fill(null)
    return [...padding, ...reversed]
  }, [asks])

  const paddedBids = useMemo(() => {
    const sliced = bids.slice(0, DEPTH_ROWS)
    const emptyCount = DEPTH_ROWS - sliced.length
    const padding = Array<OrderBookEntry | null>(emptyCount).fill(null)
    return [...sliced, ...padding]
  }, [bids])

  // Calculate real spread (lowest ask - highest bid)
  const spread = useMemo(() => {
    const bestAsk = asks[0]?.price
    const bestBid = bids[0]?.price
    if (bestAsk !== undefined && bestBid !== undefined && bestAsk >= bestBid) {
      return (bestAsk - bestBid).toFixed(2)
    }
    return '0.00'
  }, [asks, bids])

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between h-full select-none">
      {/* Header title & columns */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Order Book
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Realtime Depth</span>
        </div>

        <div className="grid grid-cols-3 text-[11px] font-semibold text-zinc-500 pb-1 px-1">
          <span>Price ({quoteAsset})</span>
          <span className="text-right">Size ({baseAsset})</span>
          <span className="text-right">Total</span>
        </div>
      </div>

      {/* Top Box: Sell Orders (Asks) — Fixed 7 Rows (140px height) */}
      <div className="h-[140px] flex flex-col justify-end overflow-hidden space-y-0.5">
        {paddedAsks.map((ask, idx) => {
          if (!ask) {
            return <div key={`ask-slot-${idx}`} className="h-[18px]" />
          }
          const depthPercent = Math.min(100, Math.max(5, (ask.total / maxAskTotal) * 100))
          return (
            <div
              key={`ask-${ask.price}-${idx}`}
              className="relative grid grid-cols-3 text-xs font-mono h-[18px] items-center px-1 hover:bg-zinc-900/80 cursor-pointer rounded tabular-nums"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-rose-950/40 rounded-r pointer-events-none transition-all duration-300"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-rose-400 font-medium relative z-10">
                {ask.price.toFixed(2)}
              </span>
              <span className="text-right text-zinc-300 relative z-10">
                {ask.size.toFixed(4)}
              </span>
              <span className="text-right text-zinc-500 relative z-10">
                {ask.total.toFixed(4)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Center Spread Banner — Fixed Height (34px) */}
      <div className="h-[34px] my-1 px-2.5 bg-zinc-900/90 border-y border-zinc-800/80 rounded flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-400 tabular-nums">
            ${currentPrice.toFixed(2)}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 tabular-nums">
          Spread <span className="text-zinc-200 font-semibold">{spread}</span>
        </span>
      </div>

      {/* Middle Box: Buy Orders (Bids) — Fixed 7 Rows (140px height) */}
      <div className="h-[140px] flex flex-col overflow-hidden space-y-0.5">
        {paddedBids.map((bid, idx) => {
          if (!bid) {
            return <div key={`bid-slot-${idx}`} className="h-[18px]" />
          }
          const depthPercent = Math.min(100, Math.max(5, (bid.total / maxBidTotal) * 100))
          return (
            <div
              key={`bid-${bid.price}-${idx}`}
              className="relative grid grid-cols-3 text-xs font-mono h-[18px] items-center px-1 hover:bg-zinc-900/80 cursor-pointer rounded tabular-nums"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-950/40 rounded-r pointer-events-none transition-all duration-300"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-emerald-400 font-medium relative z-10">
                {bid.price.toFixed(2)}
              </span>
              <span className="text-right text-zinc-300 relative z-10">
                {bid.size.toFixed(4)}
              </span>
              <span className="text-right text-zinc-500 relative z-10">
                {bid.total.toFixed(4)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
