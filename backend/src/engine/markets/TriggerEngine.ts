import type { Order, Trade, TriggerOrder } from "../types.js";

export class TriggerEngine {

    market: string = '';
    constructor(marketPair: string) {
        this.market = marketPair;
    }

    // SL & TP maps: price -> TriggerOrder[]
    private triggerOnPriceDrop: Map<number, TriggerOrder[]> = new Map(); // For Take Profit of buy and Stop Loss of sell
    private triggerOnPriceRise: Map<number, TriggerOrder[]> = new Map(); // For Stop Loss of buy and Take Profit of sell

    // Fast O(1) index lookup by trigger order ID
    private triggerIndex: Map<string, TriggerOrder> = new Map();

    addTriggerOrder(order: TriggerOrder): void {
        order.id ??= crypto.randomUUID();

        const targetMap = order.triggerDirection === 'BELOW'
            ? this.triggerOnPriceDrop
            : this.triggerOnPriceRise;

        const existing = targetMap.get(order.triggerPrice) || [];
        existing.push(order);
        targetMap.set(order.triggerPrice, existing);

        this.triggerIndex.set(order.id, order);
    }

    removeTriggerOrder(orderId: string): boolean {
        const order = this.triggerIndex.get(orderId);
        if (!order) return false;

        const targetMap = order.triggerDirection === 'BELOW'
            ? this.triggerOnPriceDrop
            : this.triggerOnPriceRise;

        const orders = targetMap.get(order.triggerPrice);
        if (orders) {
            const index = orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                orders.splice(index, 1);
                if (orders.length === 0) {
                    targetMap.delete(order.triggerPrice);
                }
            }
        }

        this.triggerIndex.delete(orderId);
        return true;
    }

    checkTriggers(oldPrice: number, newPrice: number): TriggerOrder[] {
        const triggeredOrders: TriggerOrder[] = [];

        if (newPrice > oldPrice) {
            // Price rose: trigger orders waiting for price rise (oldPrice < triggerPrice <= newPrice)
            for (const [price, orders] of this.triggerOnPriceRise.entries()) {
                if (price > oldPrice && price <= newPrice) {
                    triggeredOrders.push(...orders);
                    this.triggerOnPriceRise.delete(price);
                }
            }
        } else if (newPrice < oldPrice) {
            // Price dropped: trigger orders waiting for price drop (newPrice <= triggerPrice < oldPrice)
            for (const [price, orders] of this.triggerOnPriceDrop.entries()) {
                if (price >= newPrice && price < oldPrice) {
                    triggeredOrders.push(...orders);
                    this.triggerOnPriceDrop.delete(price);
                }
            }
        } else {
            // Price unchanged: check exact price matches
            const riseOrders = this.triggerOnPriceRise.get(newPrice);
            if (riseOrders) {
                triggeredOrders.push(...riseOrders);
                this.triggerOnPriceRise.delete(newPrice);
            }
            const dropOrders = this.triggerOnPriceDrop.get(newPrice);
            if (dropOrders) {
                triggeredOrders.push(...dropOrders);
                this.triggerOnPriceDrop.delete(newPrice);
            }
        }

        // Remove triggered orders from the index map
        for (const order of triggeredOrders) {
            if (order.id) {
                this.triggerIndex.delete(order.id);
            }
        }

        return triggeredOrders;
    }
}