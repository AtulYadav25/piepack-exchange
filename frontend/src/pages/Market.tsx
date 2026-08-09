import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const Market: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 py-8">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Market Dashboard
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Live market data, charts, and trading order book will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-zinc-800/60 mt-4">
            <p className="text-zinc-500 text-sm font-mono">
              [ Market Data Workspace Empty ]
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}

export default Market
