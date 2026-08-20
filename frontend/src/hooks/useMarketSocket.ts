import { useEffect, useRef, useState } from 'react';
import { on, send, initWsClient } from '../ws/wsClient';

// WS event constants (mirror backend types)

const SUBSCRIBE_MARKET = 'SUBSCRIBE_MARKET';
const UNSUBSCRIBE_MARKET = 'UNSUBSCRIBE_MARKET';
const PRICE_TICK = 'PRICE_TICK';

interface PriceTickPayload {
  symbol: string;
  price: number;
}

// Hook

/*
Subscribes to live PRICE_TICK events for the given market symbol.

Usage:
const { price, isConnected } = useMarketSocket('BTC-USDC');
*/
export function useMarketSocket(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  useEffect(() => {
    // Ensure the only one client is started
    initWsClient();

    // Subscribe on the server
    send(SUBSCRIBE_MARKET, { symbol });
    setIsConnected(true);

    // Listen for price ticks
    const unsub = on<PriceTickPayload>(PRICE_TICK, (payload) => {
      if (payload.symbol === symbolRef.current) {
        setPrice(payload.price);
      }
    });

    return () => {
      // Unsubscribe from this market room when the component unmounts
      send(UNSUBSCRIBE_MARKET, { symbol: symbolRef.current });
      unsub();
      setIsConnected(false);
    };
  }, [symbol]);

  return { price, isConnected };
}
