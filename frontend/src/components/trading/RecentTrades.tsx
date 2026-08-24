import React, { useEffect, useRef, useMemo } from 'react'
import type { RecentTrade } from '../../config/tradingMockData'

interface RecentTradesProps {
  trades: RecentTrade[]
  quoteAsset?: string
  baseAsset?: string
}

const LATEST_TRADES_LIMIT = 15

export const RecentTrades: React.FC<RecentTradesProps> = ({
  trades,
  quoteAsset = 'USDC',
  baseAsset = 'BTC',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const displayTrades = useMemo(() => {
    return trades.slice(0, LATEST_TRADES_LIMIT).reverse()
  }, [trades])

  // Auto-scroll to bottom so latest trade at the bottom is always visible
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayTrades])

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between h-full select-none">
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            All Trades
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Recent Executions</span>
        </div>

        <div className="grid grid-cols-3 text-[11px] font-semibold text-zinc-500 pb-1 px-1">
          <span>Price ({quoteAsset})</span>
          <span className="text-right">Size ({baseAsset})</span>
          <span className="text-right">Time</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="space-y-0.5 overflow-y-auto no-scrollbar flex-1 max-h-[160px] pr-0.5 scroll-smooth"
      >
        {displayTrades.map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-3 text-xs font-mono py-0.5 px-1 hover:bg-zinc-900/60 rounded tabular-nums h-[20px] items-center"
          >
            <span
              className={`font-medium ${trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                }`}
            >
              {trade.price.toFixed(2)}
            </span>
            <span className="text-right text-zinc-300">{trade.size.toFixed(4)}</span>
            <span className="text-right text-zinc-500">{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

