import type { Order, PlaceOrderRequest, Trade } from "../types.js";
import { OrderBook } from "./OrderBook.js";
import { TriggerEngine } from "./TriggerEngine.js";
import { trades } from "../MemoryDb.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import {
    produceTradeEvent,
    produceOrderEvent,
    TRADE_EVENT_TYPES,
    ORDER_EVENT_TYPES,
} from "../../kafka-infrastructure/index.js";

export class MarketEngine {

    private orderBook: OrderBook;
    private triggerEngine: TriggerEngine;
    private balanceEngine: BalanceEngine;

    currentPrice: number;

    constructor(symbol: string, balanceEngine: BalanceEngine) {
        this.orderBook     = new OrderBook(symbol);
        this.triggerEngine = new TriggerEngine(symbol);
        this.balanceEngine = balanceEngine;
        this.currentPrice  = 10; // TODO : Lets get this price from the constructor arguments
    }

    placeUserOrder(req: PlaceOrderRequest): void {
        let executedTrades: Trade[] = [];
        if (req.order.type === 'limit') {
            executedTrades = this.orderBook.addLimitOrder(req.order);
        } else if (req.order.type === 'market') {
            executedTrades = this.orderBook.addMarketOrder(req.order);
        }

        // Consume funds & produce TRADE_EXECUTED events for each matched trade
        for (const trade of executedTrades) {
            const takerOrder = req.order;
            const makerOrder: Order = { ...takerOrder, userId: trade.makerUserId };
            this.balanceEngine.consumeFunds(trade, makerOrder, takerOrder);

            // Produce TRADE_EXECUTED event to Kafka
            produceTradeEvent(TRADE_EVENT_TYPES.EXECUTED, {
                tradeId: trade.id,
                market: trade.market,
                price: trade.price,
                quantity: trade.quantity,
                makerOrderId: trade.makerOrderId,
                takerOrderId: trade.takerOrderId,
                makerUserId: trade.makerUserId,
                takerUserId: trade.takerUserId,
                executedAt: trade.executedAt,
            }).catch((err) => console.error("Failed to produce TRADE_EXECUTED event:", err));
        }

        if (executedTrades.length > 0) {
            trades.push(...executedTrades);

            // Produce ORDER_FILLED or ORDER_PARTIALLY_FILLED event for taker order
            const remaining = req.order.remainingQuantity ?? 0;
            const eventType = remaining === 0 ? ORDER_EVENT_TYPES.FILLED : ORDER_EVENT_TYPES.PARTIALLY_FILLED;
            produceOrderEvent(eventType, {
                orderId: req.order.id || crypto.randomUUID(),
                userId: req.userId,
                market: req.market,
                side: req.order.side,
                type: req.order.type,
                price: req.order.price,
                quantity: req.order.quantity,
                remainingQuantity: remaining,
                status: remaining === 0 ? 'filled' : 'partially_filled',
            }).catch((err) => console.error("Failed to produce order status event:", err));
        }

        if (executedTrades.length === 0) return;

        // Calculate filled quantity from executed trades
        const filledQuantity = executedTrades.reduce((acc, trade) => acc + trade.quantity, 0);

        // Release any unmatched locked funds for market orders
        const remainingQty = (req.order.remainingQuantity ?? req.order.quantity) - filledQuantity;
        if (remainingQty > 0 && req.order.type === 'market') {
            this.balanceEngine.releaseFunds(req.order, remainingQty);
        }

        // Registers SL and TP with filled quantity only
        if (filledQuantity > 0 && req.bracket) {
            const { stopLoss, takeProfit } = req.bracket;

            // Link OCO siblings if both SL and TP are present
            if (stopLoss && takeProfit) {
                stopLoss.siblingId = takeProfit.id;
                takeProfit.siblingId = stopLoss.id;
            }

            if (stopLoss) {
                stopLoss.quantity = filledQuantity;
                stopLoss.remainingQuantity = filledQuantity;
                this.triggerEngine.addTriggerOrder(stopLoss);
            }

            if (takeProfit) {
                takeProfit.quantity = filledQuantity;
                takeProfit.remainingQuantity = filledQuantity;
                this.triggerEngine.addTriggerOrder(takeProfit);
            }
        }

        // 3. Process triggers based on price movement
        const oldPrice = this.currentPrice;
        const newPrice = executedTrades.at(-1)?.price ?? this.currentPrice;
        this.currentPrice = newPrice;

        this.processTriggers(oldPrice, newPrice);
    }

    private processTriggers(initialOldPrice: number, initialNewPrice: number): void {
        let oldPrice = initialOldPrice;
        let newPrice = initialNewPrice;

        while (oldPrice !== newPrice) {
            const triggeredOrders = this.triggerEngine.checkTriggers(oldPrice, newPrice);
            if (triggeredOrders.length === 0) break;

            const priceBeforeExecution = this.currentPrice;

            for (const trigOrder of triggeredOrders) {
                // OCO: Remove sibling trigger order if present
                if (trigOrder.siblingId) {
                    this.triggerEngine.removeTriggerOrder(trigOrder.siblingId);
                }

                // Place triggered order into order book
                const constructedOrder: Order = {
                    id: crypto.randomUUID(),
                    userId: trigOrder.userId,
                    market: trigOrder.market,
                    side: trigOrder.side,
                    type: trigOrder.type,
                    price: trigOrder.type === 'limit' ? trigOrder.triggerPrice : null,
                    quantity: trigOrder.quantity,
                    remainingQuantity: trigOrder.quantity,
                    status: 'open',
                    createdAt: Date.now()
                };

                let newTrades: Trade[] = [];
                if (constructedOrder.type === 'limit') {
                    newTrades = this.orderBook.addLimitOrder(constructedOrder);
                } else if (constructedOrder.type === 'market') {
                    newTrades = this.orderBook.addMarketOrder(constructedOrder);
                }

                if (newTrades.length > 0) {
                    trades.push(...newTrades);
                    this.currentPrice = newTrades.at(-1)!.price;

                    for (const trade of newTrades) {
                        produceTradeEvent(TRADE_EVENT_TYPES.EXECUTED, {
                            tradeId: trade.id,
                            market: trade.market,
                            price: trade.price,
                            quantity: trade.quantity,
                            makerOrderId: trade.makerOrderId,
                            takerOrderId: trade.takerOrderId,
                            makerUserId: trade.makerUserId,
                            takerUserId: trade.takerUserId,
                            executedAt: trade.executedAt,
                        }).catch((err) => console.error("Failed to produce TRADE_EXECUTED event:", err));
                    }
                }
            }

            oldPrice = priceBeforeExecution;
            newPrice = this.currentPrice;
        }
    }
}