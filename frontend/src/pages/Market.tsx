import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cryptoMarkets } from '../config/markets'

const Market: React.FC = () => {
  const navigate = useNavigate()

  const handleMarketClick = (symbol: string) => {
    navigate(`/market/${symbol.toLowerCase()}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 py-8">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Markets
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Select a trading pair to view order book and trade
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cryptoMarkets.map((market) => (
                <div
                  key={market.symbol}
                  onClick={() => handleMarketClick(market.symbol)}
                  className="group flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3.5">
                    {market.logo ? (
                      <img
                        src={market.logo}
                        alt={`${market.baseAsset} logo`}
                        className="w-10 h-10 object-contain rounded-full bg-zinc-950 p-1 border border-zinc-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                        {market.baseAsset[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-base text-white tracking-wide group-hover:text-emerald-400 transition-colors">
                        {market.baseAsset} / {market.quoteAsset}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        {market.symbol}
                      </div>
                    </div>
                  </div>

                  <div className="text-zinc-500 group-hover:text-white transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}

export default Market
