import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TradeFormProps {
  symbol?: string
  currentPrice: number
  baseAsset?: string
  quoteAsset?: string
  onPlaceOrder?: (order: { side: 'BUY' | 'SELL'; price: number; amount: number; type: 'LIMIT' | 'MARKET' }) => void
}

export const TradeForm: React.FC<TradeFormProps> = ({
  symbol: _symbol,
  currentPrice,
  baseAsset = 'BTC',
  quoteAsset = 'USDC',
  onPlaceOrder,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [price, setPrice] = useState<string>(currentPrice.toString())
  const [amount, setAmount] = useState<string>('')
  const [percentage, setPercentage] = useState<number>(0)

  const userUsdcBalance = 10000.0
  const userBaseBalance = 1.25

  const parsedPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price) || 0
  const parsedAmount = parseFloat(amount) || 0
  const totalValue = parsedPrice * parsedAmount

  const handlePercentageClick = (pct: number) => {
    setPercentage(pct)
    if (side === 'BUY') {
      const maxSpend = (userUsdcBalance * (pct / 100))
      const calculatedAmount = parsedPrice > 0 ? (maxSpend / parsedPrice).toFixed(4) : '0'
      setAmount(calculatedAmount)
    } else {
      const calculatedAmount = (userBaseBalance * (pct / 100)).toFixed(4)
      setAmount(calculatedAmount)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (onPlaceOrder) {
      onPlaceOrder({
        side,
        type: orderType,
        price: parsedPrice,
        amount: parsedAmount,
      })
    }

    toast.success(`${side} order placed for ${parsedAmount} ${baseAsset}`)
    setAmount('')
    setPercentage(0)
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between h-full space-y-4">
      <div>
        {/* Buy / Sell Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80 mb-4">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 text-xs font-bold rounded-md transition-all ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Buy {baseAsset}
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 text-xs font-bold rounded-md transition-all ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sell {baseAsset}
          </button>
        </div>

        {/* Limit / Market Order Type Selector */}
        <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-3 mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`pb-1 border-b-2 transition-colors ${
              orderType === 'LIMIT'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`pb-1 border-b-2 transition-colors ${
              orderType === 'MARKET'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Market
          </button>
        </div>

        {/* Balance Info */}
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span>Avail. Balance:</span>
          <span className="font-mono font-semibold text-white">
            {side === 'BUY'
              ? `${userUsdcBalance.toLocaleString()} ${quoteAsset}`
              : `${userBaseBalance} ${baseAsset}`}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Price Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <Label htmlFor="trade-price" className="text-xs">Price</Label>
              <span className="text-[10px] font-mono">{quoteAsset}</span>
            </div>
            {orderType === 'LIMIT' ? (
              <Input
                id="trade-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs focus:border-zinc-700"
                placeholder="0.00"
              />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono p-2.5 rounded-md">
                Market Price (~${currentPrice.toFixed(2)})
              </div>
            )}
          </div>

          {/* Quantity / Amount Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <Label htmlFor="trade-amount" className="text-xs">Amount</Label>
              <span className="text-[10px] font-mono">{baseAsset}</span>
            </div>
            <Input
              id="trade-amount"
              type="number"
              step="0.0001"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setPercentage(0)
              }}
              className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs focus:border-zinc-700"
              placeholder="0.0000"
            />
          </div>

          {/* Quick Percentage Slider & Buttons */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className={`text-[11px] py-1 rounded border font-mono transition-colors ${
                    percentage === pct
                      ? 'bg-zinc-800 border-zinc-700 text-white font-bold'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Order Value Display */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Order Value:</span>
            <span className="font-bold text-white">${totalValue.toFixed(2)}</span>
          </div>

          {/* Submit Action Button */}
          <Button
            type="submit"
            className={`w-full py-5 font-bold tracking-wide text-sm text-white ${
              side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50'
                : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50'
            }`}
          >
            {side} {baseAsset}
          </Button>
        </form>
      </div>
    </div>
  )
}
