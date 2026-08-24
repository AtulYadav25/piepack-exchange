import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orderApi } from '../../api/order.api'

interface UserOrdersProps {
  symbol: string   // e.g. 'BTC-USDC'
}

// Helpers

function formatTime(ts: string | number): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: 'bg-amber-950/60 text-amber-400 border-amber-800/40',
    partially_filled: 'bg-blue-950/60 text-blue-400 border-blue-800/40',
    filled: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
    cancelled: 'bg-zinc-900 text-zinc-500 border-zinc-800',
  }
  return map[status] ?? 'bg-zinc-900 text-zinc-400 border-zinc-800'
}

// Sub-components

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full" />
          Loading...
        </div>
      </td>
    </tr>
  )
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-center text-xs text-zinc-500 font-mono">
        {message}
      </td>
    </tr>
  )
}

// Main Components

export const UserOrders: React.FC<UserOrdersProps> = ({ symbol }) => {
  const [activeTab, setActiveTab] = useState<'open' | 'history' | 'balances'>('open')

  const market = symbol.toUpperCase()

  // Open orders — refetch every 3s (near-realtime from engine)
  const {
    data: openData,
    isLoading: openLoading,
    error: openError,
  } = useQuery({
    queryKey: ['openOrders', market],
    queryFn: () => orderApi.getOpenOrders(market),
    refetchInterval: 3000,
    retry: 1,
  })

  // Order history — refetch every 10s (from TimescaleDB)
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['orderHistory', market],
    queryFn: () => orderApi.getOrderHistory(market),
    refetchInterval: 10_000,
    retry: 1,
    enabled: activeTab === 'history',
  })

  // Balances — refetch every 5s
  const {
    data: balancesData,
    isLoading: balancesLoading,
    error: balancesError,
  } = useQuery({
    queryKey: ['balances'],
    queryFn: () => orderApi.getBalances(),
    refetchInterval: 5000,
    retry: 1,
    enabled: activeTab === 'balances',
  })

  const openOrders = openData?.openOrders ?? []
  const historyOrders = historyData?.orders ?? []
  const balances = balancesData?.balances ?? {}

  const ASSETS = ['USDC', 'BTC', 'ETH', 'SOL'] as const

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-3">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('open')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'open'
              ? 'border-emerald-500 text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <span>Open Orders</span>
            {!openLoading && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {openOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'history'
              ? 'border-emerald-500 text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Order History
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'balances'
              ? 'border-emerald-500 text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            Balances
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 font-mono">Real-time sync</span>
      </div>

      {/* Content */}
      <div className="overflow-x-auto min-h-[140px]">
        {/* OPEN ORDERS */}
        {activeTab === 'open' && (
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800/60">
                <th className="pb-2 font-semibold">Time</th>
                <th className="pb-2 font-semibold">Pair</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Side</th>
                <th className="pb-2 font-semibold text-right">Price</th>
                <th className="pb-2 font-semibold text-right">Qty</th>
                <th className="pb-2 font-semibold text-right">Remaining</th>
                <th className="pb-2 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {openLoading && <LoadingRow cols={8} />}
              {openError && (
                <EmptyRow cols={8} message="Failed to load open orders — are you logged in?" />
              )}
              {!openLoading && !openError && openOrders.length === 0 && (
                <EmptyRow cols={8} message="No open orders on this market" />
              )}
              {openOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2 text-zinc-400">
                    {order.createdAt ? formatTime(order.createdAt) : '—'}
                  </td>
                  <td className="py-2 text-white font-bold">{order.market}</td>
                  <td className="py-2 text-zinc-400 capitalize">{order.type}</td>
                  <td className={`py-2 font-bold capitalize ${order.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                    {order.side}
                  </td>
                  <td className="py-2 text-right text-zinc-200">
                    {order.price !== null ? `$${order.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'MKT'}
                  </td>
                  <td className="py-2 text-right text-zinc-200">{order.quantity}</td>
                  <td className="py-2 text-right text-zinc-400">{order.remainingQuantity ?? '—'}</td>
                  <td className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] border capitalize ${statusBadge(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ORDER HISTORY */}
        {activeTab === 'history' && (
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800/60">
                <th className="pb-2 font-semibold">Time</th>
                <th className="pb-2 font-semibold">Pair</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Side</th>
                <th className="pb-2 font-semibold text-right">Price</th>
                <th className="pb-2 font-semibold text-right">Qty</th>
                <th className="pb-2 font-semibold text-right">Remaining</th>
                <th className="pb-2 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {historyLoading && <LoadingRow cols={8} />}
              {historyError && (
                <EmptyRow cols={8} message="Failed to load order history" />
              )}
              {!historyLoading && !historyError && historyOrders.length === 0 && (
                <EmptyRow cols={8} message="No order history for this market yet" />
              )}
              {historyOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2 text-zinc-400">{formatTime(order.timestamp)}</td>
                  <td className="py-2 text-white font-bold">{order.market}</td>
                  <td className="py-2 text-zinc-400 capitalize">{order.type}</td>
                  <td className={`py-2 font-bold capitalize ${order.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                    {order.side}
                  </td>
                  <td className="py-2 text-right text-zinc-200">
                    {order.price !== null ? `$${order.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'MKT'}
                  </td>
                  <td className="py-2 text-right text-zinc-200">{order.quantity}</td>
                  <td className="py-2 text-right text-zinc-400">
                    {order.remainingQuantity !== null ? order.remainingQuantity : '—'}
                  </td>
                  <td className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] border capitalize ${statusBadge(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* BALANCES */}
        {activeTab === 'balances' && (
          <div className="pt-2">
            {balancesLoading && (
              <div className="h-24 flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full" />
                Loading balances...
              </div>
            )}
            {balancesError && (
              <div className="h-24 flex items-center justify-center text-xs text-rose-400 font-mono">
                Failed to load balances — are you logged in?
              </div>
            )}
            {!balancesLoading && !balancesError && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ASSETS.map((asset) => {
                  const bal = balances[asset]
                  return (
                    <div key={asset} className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
                      <div className="text-zinc-400 text-xs mb-1">{asset}</div>
                      {bal ? (
                        <>
                          <div className="text-sm font-bold text-white font-mono">
                            {asset === 'USDC'
                              ? `$${bal.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `${bal.available.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${asset}`
                            }
                          </div>
                          {bal.locked > 0 && (
                            <div className="text-[10px] text-amber-500/80 font-mono mt-0.5">
                              {asset === 'USDC'
                                ? `$${bal.locked.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                : `${bal.locked.toFixed(6)} ${asset}`
                              } locked
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-zinc-600 font-mono">—</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
