import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import { MarketHeader } from '../components/trading/MarketHeader'
import { TradingChart } from '../components/trading/TradingChart'
import { OrderBook } from '../components/trading/OrderBook'
import { RecentTrades } from '../components/trading/RecentTrades'
import { TradeForm } from '../components/trading/TradeForm'
import { UserOrders } from '../components/trading/UserOrders'
import { cryptoMarkets } from '../config/markets'
import {
    generateMockOrderBook,
    generateMockTrades,
    MOCK_USER_ORDERS,
    type UserOrder,
} from '../config/tradingMockData'

const TradingPage: React.FC = () => {
    const { symbol = 'btc-usdc' } = useParams<{ symbol: string }>()

    const activeMarket =
        cryptoMarkets.find((m) => m.symbol.toLowerCase() === symbol.toLowerCase()) ||
        cryptoMarkets[0]

    const baseAsset = activeMarket.baseAsset
    const quoteAsset = activeMarket.quoteAsset

    // Initial mock prices
    let initialPrice = 64250.0
    if (baseAsset === 'ETH') initialPrice = 3450.0
    if (baseAsset === 'SOL') initialPrice = 145.0

    const [currentPrice, setCurrentPrice] = useState<number>(initialPrice)
    const [orderBook, setOrderBook] = useState(() => generateMockOrderBook(initialPrice))
    const [trades, setTrades] = useState(() => generateMockTrades(initialPrice))
    const [userOrders, setUserOrders] = useState<UserOrder[]>(MOCK_USER_ORDERS)

    useEffect(() => {
        let price = 64250.0
        if (baseAsset === 'ETH') price = 3450.0
        if (baseAsset === 'SOL') price = 145.0
        setCurrentPrice(price)
        setOrderBook(generateMockOrderBook(price))
        setTrades(generateMockTrades(price))
    }, [symbol, baseAsset])

    const handlePlaceOrder = (newOrder: {
        side: 'BUY' | 'SELL'
        price: number
        amount: number
        type: 'LIMIT' | 'MARKET'
    }) => {
        const created: UserOrder = {
            id: `ord-${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            pair: activeMarket.symbol,
            type: newOrder.type,
            side: newOrder.side,
            price: newOrder.price,
            amount: newOrder.amount,
            filled: 0,
            status: 'OPEN',
        }
        setUserOrders((prev) => [created, ...prev])
    }

    const handleCancelOrder = (id: string) => {
        setUserOrders((prev) =>
            prev.map((o) => (o.id === id ? { ...o, status: 'CANCELLED' } : o))
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans">
            {/* <Navbar /> */}


            <main className="flex-1 w-full px-2 py-3 sm:px-3 space-y-3">
                {/* Top Market Bar */}
                <MarketHeader symbol={symbol} currentPrice={currentPrice} />

                {/* Main 60% / 20% / 20% Flex Layout */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch w-full">
                    {/* Left Column: Chart (60% width) */}
                    <div className="w-full lg:w-[60%] flex flex-col min-h-[500px]">
                        <TradingChart symbol={symbol} />
                    </div>

                    {/* Middle Column: Sell Orders, Buy Orders, All Trades (20% width) */}
                    <div className="w-full lg:w-[20%] flex flex-col space-y-3">
                        <div className="flex-1 min-h-[290px]">
                            <OrderBook
                                asks={orderBook.asks}
                                bids={orderBook.bids}
                                currentPrice={currentPrice}
                                baseAsset={baseAsset}
                                quoteAsset={quoteAsset}
                            />
                        </div>
                        <div className="h-[210px]">
                            <RecentTrades trades={trades} baseAsset={baseAsset} quoteAsset={quoteAsset} />
                        </div>
                    </div>

                    {/* Right Column: Buy / Sell Form Panel (20% width) */}
                    <div className="w-full lg:w-[20%] flex flex-col min-h-[500px]">
                        <TradeForm
                            symbol={symbol}
                            currentPrice={currentPrice}
                            baseAsset={baseAsset}
                            quoteAsset={quoteAsset}
                            onPlaceOrder={handlePlaceOrder}
                        />
                    </div>
                </div>

                {/* Bottom Full-width Panel: Open Orders, Order History, Trades */}
                <UserOrders orders={userOrders} onCancelOrder={handleCancelOrder} />
            </main>

            <Footer />
        </div>
    )
}

export default TradingPage