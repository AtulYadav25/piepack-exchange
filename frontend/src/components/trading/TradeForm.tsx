import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthState } from '../../hooks/useAuth'
import { orderApi, type PlaceOrderPayload } from '../../api/order.api'

interface TradeFormProps {
  symbol?: string
  currentPrice: number
  baseAsset?: string
  quoteAsset?: string
  onPlaceOrder?: (order: { side: 'BUY' | 'SELL'; price: number; amount: number; type: 'LIMIT' | 'MARKET' }) => void
}

export const TradeForm: React.FC<TradeFormProps> = ({
  symbol,
  currentPrice,
  baseAsset = 'BTC',
  quoteAsset = 'USDC',
  onPlaceOrder,
}) => {
  const { isAuthenticated, user } = useAuthState()
  const queryClient = useQueryClient()

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [price, setPrice] = useState<string>(currentPrice > 0 ? currentPrice.toString() : '')
  const [amount, setAmount] = useState<string>('')
  const [percentage, setPercentage] = useState<number>(0)
  const [enableTpSl, setEnableTpSl] = useState<boolean>(false)
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('')
  const [stopLossPrice, setStopLossPrice] = useState<string>('')

  // Keep limit price updated with currentPrice if empty or limit order initialized
  useEffect(() => {
    if (orderType === 'LIMIT' && (!price || price === '0')) {
      setPrice(currentPrice.toString())
    }
  }, [currentPrice, orderType])

  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ['balances'],
    queryFn: () => orderApi.getBalances(),
    enabled: isAuthenticated,
    refetchInterval: 5000,
    retry: 1,
  })

  const balances = balancesData?.balances ?? {}
  const userUsdcBalance = balances[quoteAsset]?.available ?? 0
  const userBaseBalance = balances[baseAsset]?.available ?? 0

  const parsedPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price) || 0
  const parsedAmount = parseFloat(amount) || 0
  const totalValue = parsedPrice * parsedAmount

  // TP / SL Calculations
  const parsedTp = parseFloat(takeProfitPrice) || 0
  const parsedSl = parseFloat(stopLossPrice) || 0

  const getTpGainPercentage = () => {
    if (!parsedTp || !parsedPrice) return null
    const pct = side === 'BUY'
      ? ((parsedTp - parsedPrice) / parsedPrice) * 100
      : ((parsedPrice - parsedTp) / parsedPrice) * 100
    return pct
  }

  const getSlLossPercentage = () => {
    if (!parsedSl || !parsedPrice) return null
    const pct = side === 'BUY'
      ? ((parsedPrice - parsedSl) / parsedPrice) * 100
      : ((parsedSl - parsedPrice) / parsedPrice) * 100
    return pct
  }

  const tpGainPct = getTpGainPercentage()
  const slLossPct = getSlLossPercentage()

  const handleTpPreset = (pct: number) => {
    if (parsedPrice <= 0) return
    const targetPrice = side === 'BUY'
      ? parsedPrice * (1 + pct / 100)
      : parsedPrice * (1 - pct / 100)
    setTakeProfitPrice(Math.max(0, targetPrice).toFixed(2))
  }

  const handleSlPreset = (pct: number) => {
    if (parsedPrice <= 0) return
    const targetPrice = side === 'BUY'
      ? parsedPrice * (1 - pct / 100)
      : parsedPrice * (1 + pct / 100)
    setStopLossPrice(Math.max(0, targetPrice).toFixed(2))
  }

  const handlePercentageClick = (pct: number) => {
    setPercentage(pct)
    if (side === 'BUY') {
      const maxSpend = userUsdcBalance * (pct / 100)
      const calculatedAmount = parsedPrice > 0 ? (maxSpend / parsedPrice).toFixed(4) : '0'
      setAmount(calculatedAmount)
    } else {
      const calculatedAmount = (userBaseBalance * (pct / 100)).toFixed(4)
      setAmount(calculatedAmount)
    }
  }

  const placeOrderMutation = useMutation({
    mutationFn: (payload: PlaceOrderPayload) => orderApi.placeOrder(payload),
    onSuccess: () => {
      toast.success(`${side} order placed successfully!`)
      setAmount('')
      setPercentage(0)
      setTakeProfitPrice('')
      setStopLossPrice('')

      // Refetch balance & open orders immediately after successful order placement
      queryClient.invalidateQueries({ queryKey: ['balances'] })
      queryClient.invalidateQueries({ queryKey: ['openOrders'] })
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] })

      if (onPlaceOrder) {
        onPlaceOrder({
          side,
          type: orderType,
          price: parsedPrice,
          amount: parsedAmount,
        })
      }
    },
    onError: (err: any) => {
      const errorMsg = err?.message || err?.response?.data?.message || 'Failed to place order'
      toast.error(errorMsg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated || !user?.id) {
      toast.error('Please log in to place orders')
      return
    }

    if (parsedAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (orderType === 'LIMIT' && parsedPrice <= 0) {
      toast.error('Please enter a valid limit price')
      return
    }

    // Balance checks
    if (side === 'BUY' && totalValue > userUsdcBalance) {
      toast.error(`Insufficient ${quoteAsset} balance`)
      return
    }

    if (side === 'SELL' && parsedAmount > userBaseBalance) {
      toast.error(`Insufficient ${baseAsset} balance`)
      return
    }

    const parsedTpPrice = takeProfitPrice ? parseFloat(takeProfitPrice) : 0
    const parsedSlPrice = stopLossPrice ? parseFloat(stopLossPrice) : 0

    if (enableTpSl) {
      if (takeProfitPrice) {
        if (isNaN(parsedTpPrice) || parsedTpPrice <= 0) {
          toast.error('Please enter a valid Take Profit price')
          return
        }
        if (side === 'BUY' && parsedTpPrice <= parsedPrice) {
          toast.error(`Take Profit price must be greater than entry price ($${parsedPrice.toFixed(2)})`)
          return
        }
        if (side === 'SELL' && parsedTpPrice >= parsedPrice) {
          toast.error(`Take Profit price must be less than entry price ($${parsedPrice.toFixed(2)})`)
          return
        }
      }

      if (stopLossPrice) {
        if (isNaN(parsedSlPrice) || parsedSlPrice <= 0) {
          toast.error('Please enter a valid Stop Loss price')
          return
        }
        if (side === 'BUY' && parsedSlPrice >= parsedPrice) {
          toast.error(`Stop Loss price must be less than entry price ($${parsedPrice.toFixed(2)})`)
          return
        }
        if (side === 'SELL' && parsedSlPrice <= parsedPrice) {
          toast.error(`Stop Loss price must be greater than entry price ($${parsedPrice.toFixed(2)})`)
          return
        }
      }
    }

    const marketSymbol = (symbol || `${baseAsset}-${quoteAsset}`).toUpperCase()

    let bracket: PlaceOrderPayload['bracket'] = undefined
    if (enableTpSl && (parsedTpPrice > 0 || parsedSlPrice > 0)) {
      bracket = {}
      const exitSide = side === 'BUY' ? 'sell' : 'buy'

      if (parsedSlPrice > 0) {
        bracket.stopLoss = {
          userId: user.id,
          market: marketSymbol,
          side: exitSide,
          type: 'market',
          quantity: parsedAmount,
          triggerPrice: parsedSlPrice,
          triggerDirection: side === 'BUY' ? 'BELOW' : 'ABOVE',
          triggerType: 'stoploss',
        }
      }

      if (parsedTpPrice > 0) {
        bracket.takeProfit = {
          userId: user.id,
          market: marketSymbol,
          side: exitSide,
          type: 'market',
          quantity: parsedAmount,
          triggerPrice: parsedTpPrice,
          triggerDirection: side === 'BUY' ? 'ABOVE' : 'BELOW',
          triggerType: 'takeprofit',
        }
      }
    }

    const payload: PlaceOrderPayload = {
      userId: user.id,
      market: marketSymbol,
      order: {
        userId: user.id,
        market: marketSymbol,
        side: side.toLowerCase() as 'buy' | 'sell',
        type: orderType.toLowerCase() as 'limit' | 'market',
        price: orderType === 'LIMIT' ? parsedPrice : null,
        quantity: parsedAmount,
      },
      bracket,
    }

    placeOrderMutation.mutate(payload)
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between h-full space-y-4">
      <div>
        {/* Buy / Sell Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80 mb-4">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 text-xs font-bold rounded-md transition-all ${side === 'BUY'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Buy {baseAsset}
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 text-xs font-bold rounded-md transition-all ${side === 'SELL'
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
            className={`pb-1 border-b-2 transition-colors ${orderType === 'LIMIT'
              ? 'border-emerald-500 text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`pb-1 border-b-2 transition-colors ${orderType === 'MARKET'
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
            {!isAuthenticated ? (
              <span className="text-zinc-500 text-[11px]">Log in to view</span>
            ) : balancesLoading ? (
              <span className="text-zinc-500 animate-pulse">Loading...</span>
            ) : side === 'BUY' ? (
              `${userUsdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${quoteAsset}`
            ) : (
              `${userBaseBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${baseAsset}`
            )}
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

          {/* Quick Percentage Buttons */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className={`text-[11px] py-1 rounded border font-mono transition-colors ${percentage === pct
                    ? 'bg-zinc-800 border-zinc-700 text-white font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* TP / SL Toggle and Section */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="tp-sl-toggle" className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  id="tp-sl-toggle"
                  checked={enableTpSl}
                  onChange={(e) => setEnableTpSl(e.target.checked)}
                />
                <span className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors">
                  Take Profit / Stop Loss
                </span>
              </label>
              {enableTpSl && (
                <button
                  type="button"
                  onClick={() => {
                    setTakeProfitPrice('')
                    setStopLossPrice('')
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {enableTpSl && (
              <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg space-y-3">
                {/* Take Profit */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <Label htmlFor="tp-price" className="text-[11px] text-zinc-300">Take Profit</Label>
                    </div>
                    {tpGainPct !== null && (
                      <span className={`text-[10px] font-mono font-medium ${tpGainPct > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {tpGainPct > 0 ? `+${tpGainPct.toFixed(1)}%` : `${tpGainPct.toFixed(1)}%`}
                        {parsedAmount > 0 && ` (~$${Math.abs((parsedTp - parsedPrice) * parsedAmount).toFixed(2)})`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <Input
                      id="tp-price"
                      type="number"
                      step="0.01"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(e.target.value)}
                      placeholder={parsedPrice > 0 ? (side === 'BUY' ? `> ${parsedPrice.toFixed(2)}` : `< ${parsedPrice.toFixed(2)}`) : '0.00'}
                      className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs focus:border-emerald-600/60 h-7"
                    />
                    <div className="flex gap-1 shrink-0">
                      {[5, 10, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleTpPreset(pct)}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800/80 hover:bg-emerald-950 hover:text-emerald-400 border border-zinc-700/60 hover:border-emerald-800 rounded text-zinc-300 transition-colors"
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stop Loss */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <Label htmlFor="sl-price" className="text-[11px] text-zinc-300">Stop Loss</Label>
                    </div>
                    {slLossPct !== null && (
                      <span className={`text-[10px] font-mono font-medium ${slLossPct > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {slLossPct > 0 ? `-${slLossPct.toFixed(1)}%` : `${slLossPct.toFixed(1)}%`}
                        {parsedAmount > 0 && ` (~$${Math.abs((parsedSl - parsedPrice) * parsedAmount).toFixed(2)})`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <Input
                      id="sl-price"
                      type="number"
                      step="0.01"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      placeholder={parsedPrice > 0 ? (side === 'BUY' ? `< ${parsedPrice.toFixed(2)}` : `> ${parsedPrice.toFixed(2)}`) : '0.00'}
                      className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs focus:border-rose-600/60 h-7"
                    />
                    <div className="flex gap-1 shrink-0">
                      {[2, 5, 10].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSlPreset(pct)}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800/80 hover:bg-rose-950 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-800 rounded text-zinc-300 transition-colors"
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Value Display */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Order Value:</span>
            <span className="font-bold text-white">${totalValue.toFixed(2)}</span>
          </div>

          {/* Submit Action Button */}
          <Button
            type="submit"
            disabled={placeOrderMutation.isPending}
            className={`w-full py-5 font-bold tracking-wide text-sm text-white ${side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50'
              : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50'
              } ${placeOrderMutation.isPending ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {placeOrderMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Placing Order...
              </span>
            ) : (
              `${side} ${baseAsset}`
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
