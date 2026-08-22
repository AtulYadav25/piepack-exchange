//  Inbound message types (Client → Server)

import type { Market } from "../engine/config.js";

export const WS_CLIENT_EVENTS = {
  SUBSCRIBE_MARKET: 'SUBSCRIBE_MARKET',
  UNSUBSCRIBE_MARKET: 'UNSUBSCRIBE_MARKET',
  SUBSCRIBE_NOTIFICATIONS: 'SUBSCRIBE_NOTIFICATIONS',
  UNSUBSCRIBE_NOTIFICATIONS: 'UNSUBSCRIBE_NOTIFICATIONS',
  PING: 'PING',
} as const;

// Outbound message types (Server → Client)

export const WS_SERVER_EVENTS = {
  PRICE_TICK: 'PRICE_TICK',
  ORDER_BOOK_SNAPSHOT: 'ORDER_BOOK_SNAPSHOT',
  RECENT_TRADES: 'RECENT_TRADES',
  NOTIFICATION: 'NOTIFICATION',
  PONG: 'PONG',
  ERROR: 'ERROR',
  SUBSCRIBED: 'SUBSCRIBED',
} as const;

// Shared envelope 

export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  ts: number;
}

// Payload shapes 

export interface SubscribeMarketPayload {
  symbol: Market;
}

export interface PriceTickPayload {
  symbol: Market;
  price: number;
}

/** Each entry: [price, totalQuantity] — top N levels only */
export type OrderBookLevel = [price: number, totalQty: number];

export interface OrderBookSnapshotPayload {
  symbol: Market;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface RecentTradePayload {
  id: string;
  market: Market;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';   // taker side
  executedAt: number;
}

export interface RecentTradesPayload {
  symbol: Market;
  trades: RecentTradePayload[];
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface SubscribeNotificationsPayload {
  userId: string;
}

// Helper to build a server-side message

export function buildMessage<T>(type: string, payload: T): string {
  const msg: WsMessage<T> = { type, payload, ts: Date.now() };
  return JSON.stringify(msg);
}
