import type { Market } from "./config.js";

type Side = 'buy' | 'sell';
type OrderType = 'limit' | 'market';
type OrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled';

export interface Order {
    id: string;
    userId: string;
    market: Market;
    side: Side;
    type: OrderType;
    price: number | null;       // null for market orders
    quantity: number;           // original quantity
    remainingQuantity: number;  // what's left to fill
    status: OrderStatus;
    createdAt: number;
}

export interface TriggerOrder {
    id: string;
    userId: string;
    market: Market;
    side: Side;
    type: OrderType;
    orderId: string;
    quantity: number;           // original quantity
    remainingQuantity: number;  // what's left to fill
    status: OrderStatus;
    createdAt: number;
    triggerPrice: number;
    triggerDirection: 'ABOVE' | 'BELOW';
    triggerType: 'stoploss' | 'takeprofit';
    siblingId?: string;
}

export interface PlaceOrderRequest {
    userId: string;
    market: Market;
    order: Order;
    bracket?: {
        stopLoss?: TriggerOrder;
        takeProfit?: TriggerOrder;
    }
}

export interface Trade {
    id: string;
    market: Market;
    price: number;              // execution price = resting order's price
    quantity: number;
    makerOrderId: string;       // the resting order that was already on the book
    takerOrderId: string;       // the incoming order that caused the match
    makerUserId: string;
    takerUserId: string;
    executedAt: number;
}
