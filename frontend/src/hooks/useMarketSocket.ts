import { useEffect, useRef, useState } from 'react';
import { on, send, initWsClient } from '../ws/wsClient';

// WS event constants (mirror backend types)

const SUBSCRIBE_MARKET = 'SUBSCRIBE_MARKET';
const UNSUBSCRIBE_MARKET = 'UNSUBSCRIBE_MARKET';
const PRICE_TICK = 'PRICE_TICK';
const ORDER_BOOK_SNAPSHOT = 'ORDER_BOOK_SNAPSHOT';
const RECENT_TRADES = 'RECENT_TRADES';

// Payload types

interface PriceTickPayload {
  symbol: string;
  price: number;
}

/** [price, totalQuantity] */
export type OrderBookLevel = [number, number];

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface RecentTrade {
  id: string;
  market: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  executedAt: number;
}

interface RecentTradesPayload {
  symbol: string;
  trades: RecentTrade[];
}

// Hook

export interface MarketSocketState {
  /** Latest trade price — null until first tick */
  price: number | null;
  /** Top-7 orderbook snapshot — null until first snapshot arrives */
  orderBook: OrderBookSnapshot | null;
  /** Rolling list of recent trades (newest first, capped at 50) */
  recentTrades: RecentTrade[];
  isConnected: boolean;
}

/**
 * Subscribes to live market data for the given market symbol:
 *  - PRICE_TICK on every trade execution
 *  - ORDER_BOOK_SNAPSHOT every 500ms (top 7 bids/asks)
 *  - RECENT_TRADES pushed immediately on every trade batch
 *
 * Usage:
 *   const { price, orderBook, recentTrades } = useMarketSocket('BTC-USDC');
 */
export function useMarketSocket(symbol: string): MarketSocketState {
  const [price, setPrice] = useState<number | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookSnapshot | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  useEffect(() => {
    initWsClient();

    send(SUBSCRIBE_MARKET, { symbol });
    setIsConnected(true);

    // PRICE_TICK — on every trade
    const unsubPrice = on<PriceTickPayload>(PRICE_TICK, (payload) => {
      if (payload.symbol === symbolRef.current) {
        setPrice(payload.price);
      }
    });

    // ORDER_BOOK_SNAPSHOT — every 500ms from the server
    const unsubBook = on<OrderBookSnapshot>(ORDER_BOOK_SNAPSHOT, (payload) => {
      if (payload.symbol === symbolRef.current) {
        setOrderBook(payload);
      }
    });

    // RECENT_TRADES — pushed immediately when trades execute
    const unsubTrades = on<RecentTradesPayload>(RECENT_TRADES, (payload) => {
      if (payload.symbol === symbolRef.current) {
        setRecentTrades((prev) => {
          const merged = [...payload.trades, ...prev];
          // Deduplicate by id and cap at 50 entries
          const seen = new Set<string>();
          return merged.filter((t) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          }).slice(0, 50);
        });
      }
    });

    return () => {
      send(UNSUBSCRIBE_MARKET, { symbol: symbolRef.current });
      unsubPrice();
      unsubBook();
      unsubTrades();
      setIsConnected(false);
    };
  }, [symbol]);

  return { price, orderBook, recentTrades, isConnected };
}
