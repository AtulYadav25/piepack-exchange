import type { Order, PlaceOrderRequest, Trade } from "../types.js";
import { OrderBook } from "./OrderBook.js";
import { TriggerEngine } from "./TriggerEngine.js";
import { trades } from "../MemoryDb.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";

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

        // Consume funds for each matched trade (partial fills included)
        for (const trade of executedTrades) {
            // We need both sides of the trade to update balances correctly.
            // The taker is the incoming order; the maker is the resting order.
            const takerOrder = req.order;
            // Build a minimal maker-order shape so consumeFunds knows the market
            const makerOrder: Order = { ...takerOrder, userId: trade.makerUserId };
            this.balanceEngine.consumeFunds(trade, makerOrder, takerOrder);
        }

        if (executedTrades.length === 0) return;
        trades.push(...executedTrades);

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

    //Big Exchanges use way better process thn this, Red-Black Tree,  Min/Max Heaps.
    //These Exchanges run a dedicated machine for pair like BTC (FROM GEMINI)
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
                }
            }

            // Update prices for next iteration to handle cascading triggers
            oldPrice = priceBeforeExecution;
            newPrice = this.currentPrice;
        }
    }
}