export const TOPICS = {
  ORDERS: "orders",
  TRADES: "trades",
  BALANCES: "balances",
} as const;

export type TopicName = typeof TOPICS[keyof typeof TOPICS];

export interface Event<T> {
  eventId: string;
  eventType: string;
  version: number;
  timestamp: number;

  data: T;
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export const ORDER_EVENT_TYPES = {
  CREATED: "ORDER_CREATED",
  CANCELLED: "ORDER_CANCELLED",
  FILLED: "ORDER_FILLED",
  PARTIALLY_FILLED: "ORDER_PARTIALLY_FILLED",
} as const;

export const TRADE_EVENT_TYPES = {
  EXECUTED: "TRADE_EXECUTED",
} as const;

export const BALANCE_EVENT_TYPES = {
  RESERVED: "BALANCE_RESERVED",
  RELEASED: "BALANCE_RELEASED",
  CHANGED: "BALANCE_CHANGED",
} as const;

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface OrderEventPayload {
  orderId: string;
  userId: string;
  market: string;
  side: string;
  type: string;
  price?: number | null | undefined;
  quantity: number;
  remainingQuantity?: number;
  status: string;
}

export interface TradeEventPayload {
  tradeId: string;
  market: string;
  price: number;
  quantity: number;
  makerOrderId: string;
  takerOrderId: string;
  makerUserId: string;
  takerUserId: string;
  executedAt: number;
}

export interface BalanceEventPayload {
  userId: string;
  asset: string;
  available: number;
  locked: number;
  amount?: number;
}
