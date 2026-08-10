import React, { useState } from 'react'
import type { UserOrder } from '../../config/tradingMockData'

interface UserOrdersProps {
  orders: UserOrder[]
  onCancelOrder: (id: string) => void
}

export const UserOrders: React.FC<UserOrdersProps> = ({ orders, onCancelOrder }) => {
  const [activeTab, setActiveTab] = useState<'open' | 'history' | 'trades' | 'balances'>('open')

  const openOrders = orders.filter((o) => o.status === 'OPEN')
  const historyOrders = orders.filter((o) => o.status !== 'OPEN')

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-3">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('open')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'open'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Open Orders</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300 font-mono">
              {openOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Order History
          </button>

          <button
            onClick={() => setActiveTab('trades')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors ${
              activeTab === 'trades'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Trade History
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`text-xs font-semibold pb-2 border-b-2 transition-colors ${
              activeTab === 'balances'
                ? 'border-emerald-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Balances
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 font-mono">Real-time sync</span>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto min-h-[140px]">
        {activeTab === 'open' && (
          <>
            {openOrders.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-zinc-500 font-mono">
                No active open orders
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800/60 pb-2">
                    <th className="pb-2 font-semibold">Time</th>
                    <th className="pb-2 font-semibold">Pair</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Side</th>
                    <th className="pb-2 font-semibold text-right">Price</th>
                    <th className="pb-2 font-semibold text-right">Amount</th>
                    <th className="pb-2 font-semibold text-right">Filled</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {openOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-900/40">
                      <td className="py-2 text-zinc-400">{order.time}</td>
                      <td className="py-2 text-white font-bold">{order.pair}</td>
                      <td className="py-2 text-zinc-400">{order.type}</td>
                      <td
                        className={`py-2 font-bold ${
                          order.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {order.side}
                      </td>
                      <td className="py-2 text-right text-zinc-200">${order.price.toFixed(2)}</td>
                      <td className="py-2 text-right text-zinc-200">{order.amount}</td>
                      <td className="py-2 text-right text-zinc-400">{order.filled}</td>
                      <td className="py-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-all"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800/60 pb-2">
                <th className="pb-2 font-semibold">Time</th>
                <th className="pb-2 font-semibold">Pair</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Side</th>
                <th className="pb-2 font-semibold text-right">Price</th>
                <th className="pb-2 font-semibold text-right">Amount</th>
                <th className="pb-2 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {historyOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/40">
                  <td className="py-2 text-zinc-400">{order.time}</td>
                  <td className="py-2 text-white font-bold">{order.pair}</td>
                  <td className="py-2 text-zinc-400">{order.type}</td>
                  <td
                    className={`py-2 font-bold ${
                      order.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {order.side}
                  </td>
                  <td className="py-2 text-right text-zinc-200">${order.price.toFixed(2)}</td>
                  <td className="py-2 text-right text-zinc-200">{order.amount}</td>
                  <td className="py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] border ${
                        order.status === 'FILLED'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'trades' && (
          <div className="h-32 flex items-center justify-center text-xs text-zinc-500 font-mono">
            Recent account trades will be displayed here
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
              <div className="text-zinc-400 text-xs">USDC Balance</div>
              <div className="text-sm font-bold text-white font-mono mt-1">$10,000.00</div>
            </div>
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
              <div className="text-zinc-400 text-xs">BTC Balance</div>
              <div className="text-sm font-bold text-white font-mono mt-1">1.2500 BTC</div>
            </div>
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
              <div className="text-zinc-400 text-xs">ETH Balance</div>
              <div className="text-sm font-bold text-white font-mono mt-1">4.5000 ETH</div>
            </div>
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
              <div className="text-zinc-400 text-xs">SOL Balance</div>
              <div className="text-sm font-bold text-white font-mono mt-1">25.000 SOL</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
