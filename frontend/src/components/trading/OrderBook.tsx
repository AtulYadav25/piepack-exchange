import React from 'react'
import type { OrderBookEntry } from '../../config/tradingMockData'

interface OrderBookProps {
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
  currentPrice: number
  quoteAsset?: string
  baseAsset?: string
}

export const OrderBook: React.FC<OrderBookProps> = ({
  asks,
  bids,
  currentPrice,
  quoteAsset = 'USDC',
  baseAsset = 'BTC',
}) => {
  // Asks come in ascending order from the engine (lowest first).
  // The last entry has the largest cumulative total — use that for depth bar scaling.
  const maxAskTotal = asks.length > 0 ? asks[asks.length - 1].total : 1
  const maxBidTotal = bids.length > 0 ? bids[bids.length - 1].total : 1

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between h-full space-y-2">
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

      {/* Top Box: Sell Orders (Asks) — highest price at top, lowest at bottom (closest to spread) */}
      <div className="flex flex-col justify-end overflow-y-auto no-scrollbar flex-1 max-h-[180px]">
        <div className="text-[10px] uppercase font-bold text-rose-500/80 pb-0.5 px-1">
          Sell Orders (Asks)
        </div>
        {[...asks].reverse().map((ask, idx) => {
          const depthPercent = Math.min(100, Math.max(5, (ask.total / maxAskTotal) * 100))
          return (
            <div
              key={`ask-${idx}`}
              className="relative grid grid-cols-3 text-xs font-mono py-0.5 px-1 hover:bg-zinc-900/80 cursor-pointer rounded"
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

      {/* Center Spread Banner */}
      <div className="py-1.5 px-2 bg-zinc-900/90 border-y border-zinc-800/80 rounded flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-400">
            ${currentPrice.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-500/80">▲ $64,320.50</span>
        </div>
        <span className="text-[10px] text-zinc-500">Spread 0.02</span>
      </div>

      {/* Middle Box: Buy Orders (Bids) */}
      <div className="space-y-0.5 overflow-y-auto no-scrollbar flex-1 max-h-[180px]">
        <div className="text-[10px] uppercase font-bold text-emerald-500/80 pb-0.5 px-1">
          Buy Orders (Bids)
        </div>
        {bids.map((bid, idx) => {
          const depthPercent = Math.min(100, Math.max(5, (bid.total / maxBidTotal) * 100))
          return (
            <div
              key={`bid-${idx}`}
              className="relative grid grid-cols-3 text-xs font-mono py-0.5 px-1 hover:bg-zinc-900/80 cursor-pointer rounded"
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
