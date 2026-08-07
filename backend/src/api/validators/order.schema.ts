import { z } from 'zod';
import { SUPPORTED_MARKETS } from '../../engine/config.js';

export const MarketSchema = z.enum(SUPPORTED_MARKETS);
export const SideSchema = z.enum(['buy', 'sell']);
export const OrderTypeSchema = z.enum(['limit', 'market']);
export const OrderStatusSchema = z.enum(['open', 'partially_filled', 'filled', 'cancelled']);
export const TriggerDirectionSchema = z.enum(['ABOVE', 'BELOW']);
export const TriggerTypeSchema = z.enum(['stoploss', 'takeprofit']);

export const OrderSchema = z.object({
    id: z.string().optional(),
    userId: z.string().min(1),
    market: MarketSchema,
    side: SideSchema,
    type: OrderTypeSchema,
    price: z.number().positive().nullable().optional(),
    quantity: z.number().positive(),
    remainingQuantity: z.number().min(0).optional(),
    status: OrderStatusSchema.optional(),
    createdAt: z.number().int().positive().optional(),
});

export const TriggerOrderSchema = z.object({
    id: z.string().optional(),
    userId: z.string().min(1),
    market: MarketSchema,
    side: SideSchema,
    type: OrderTypeSchema,
    orderId: z.string().optional(),
    quantity: z.number().positive(),
    remainingQuantity: z.number().min(0).optional(),
    status: OrderStatusSchema.optional(),
    createdAt: z.number().int().positive().optional(),
    triggerPrice: z.number().positive(),
    triggerDirection: TriggerDirectionSchema,
    triggerType: TriggerTypeSchema,
    siblingId: z.string().optional(),
});

export const BracketSchema = z.object({
    stopLoss: TriggerOrderSchema.optional(),
    takeProfit: TriggerOrderSchema.optional(),
});

export const PlaceOrderRequestSchema = z.object({
    userId: z.string().min(1),
    market: MarketSchema,
    order: OrderSchema,
    bracket: BracketSchema.optional(),
});

export const TradeSchema = z.object({
    id: z.string().min(1),
    market: MarketSchema,
    price: z.number().positive(),
    quantity: z.number().positive(),
    makerOrderId: z.string().min(1),
    takerOrderId: z.string().min(1),
    makerUserId: z.string().min(1),
    takerUserId: z.string().min(1),
    executedAt: z.number().int().positive(),
});


export type Market = z.infer<typeof MarketSchema>;
export type Side = z.infer<typeof SideSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type TriggerDirection = z.infer<typeof TriggerDirectionSchema>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type TriggerOrder = z.infer<typeof TriggerOrderSchema>;
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;
export type Trade = z.infer<typeof TradeSchema>;