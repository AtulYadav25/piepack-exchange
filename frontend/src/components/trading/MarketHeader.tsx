import React from 'react'
import { useNavigate } from 'react-router-dom'
import { cryptoMarkets } from '../../config/markets'

interface MarketHeaderProps {
  symbol: string
  currentPrice: number
}

export const MarketHeader: React.FC<MarketHeaderProps> = ({ symbol, currentPrice }) => {
  const navigate = useNavigate()
  const activeMarket = cryptoMarkets.find(
    (m) => m.symbol.toLowerCase() === symbol.toLowerCase()
  ) || cryptoMarkets[0]

  const baseAsset = activeMarket.baseAsset
  const quoteAsset = activeMarket.quoteAsset
  const formattedSymbol = activeMarket.symbol

  // Mock 24h stats based on price
  const changePercent = +2.45
  const isPositive = changePercent >= 0
  const high24h = (currentPrice * 1.032).toFixed(2)
  const low24h = (currentPrice * 0.975).toFixed(2)
  const volume24h = (12485.42).toLocaleString()

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
      {/* Pair Info & Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {activeMarket.logo && (
            <img
              src={activeMarket.logo}
              alt={baseAsset}
              className="w-9 h-9 object-contain rounded-full bg-zinc-900 p-1 border border-zinc-800"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">
                {baseAsset}/{quoteAsset}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
                SPOT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">{formattedSymbol}</p>
          </div>
        </div>

        {/* Pair selector dropdown */}
        <select
          value={formattedSymbol}
          onChange={(e) => navigate(`/market/${e.target.value.toLowerCase()}`)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
        >
          {cryptoMarkets.map((m) => (
            <option key={m.symbol} value={m.symbol}>
              {m.baseAsset}/{m.quoteAsset}
            </option>
          ))}
        </select>
      </div>

      {/* Stats ticker */}
      <div className="flex flex-wrap items-center gap-6 text-xs">
        <div>
          <div className="text-zinc-500 mb-0.5">Price</div>
          <div className={`text-lg font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="hidden sm:block border-l border-zinc-800 pl-6">
          <div className="text-zinc-500 mb-0.5">24h Change</div>
          <div className={`font-mono font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{changePercent}%
          </div>
        </div>

        <div className="hidden md:block border-l border-zinc-800 pl-6">
          <div className="text-zinc-500 mb-0.5">24h High</div>
          <div className="font-mono text-zinc-200">${high24h}</div>
        </div>

        <div className="hidden md:block border-l border-zinc-800 pl-6">
          <div className="text-zinc-500 mb-0.5">24h Low</div>
          <div className="font-mono text-zinc-200">${low24h}</div>
        </div>

        <div className="hidden lg:block border-l border-zinc-800 pl-6">
          <div className="text-zinc-500 mb-0.5">24h Volume ({quoteAsset})</div>
          <div className="font-mono text-zinc-200">${volume24h}</div>
        </div>

        {/* Live system status */}
        <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-zinc-400 font-mono">Live</span>
        </div>
      </div>
    </div>
  )
}
