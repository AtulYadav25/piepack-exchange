import type { Market, Order, Trade } from "../types.js";

export class OrderBook {

    market: Market;
    constructor(marketPair: string) {
        this.market = marketPair as Market; //TODO: Probably we dont need this!
    }

    // price -> orders (FIFO)
    private bids: Map<number, Order[]> = new Map();
    private asks: Map<number, Order[]> = new Map();

    bestBid: number | null = null;
    bestAsk: number | null = null;

    // For O(1) cancellation
    private orderIndex: Map<string, Order> = new Map();


    addLimitOrder(order: Order): Trade[] {
        order.id ??= crypto.randomUUID();
        order.remainingQuantity ??= order.quantity;

        if (!order.price) {
            order.status = 'cancelled';
            return [];
        }
        const trades = this.matchAgainstBook(order);

        //Update order status based on remaining quantity
        if (order.remainingQuantity === 0) {
            order.status = 'filled';
        } else if (order.remainingQuantity < order.quantity) {
            order.status = 'partially_filled';
        } else {
            order.status = 'open';
        }

        //If order is not fully filled, rest remaining quantity on the order book
        if (order.remainingQuantity > 0) {
            const sideMap = order.side === 'buy' ? this.bids : this.asks;
            const queue = sideMap.get(order.price) || [];
            queue.push(order);
            sideMap.set(order.price, queue);

            this.orderIndex.set(order.id, order);
            console.log(sideMap);
        }

        //Recalculate best bid and best ask
        this.updateBestPrices();


        return trades;
    }

    addMarketOrder(order: Order): Trade[] {
        order.id ??= crypto.randomUUID();
        order.remainingQuantity ??= order.quantity;

        // todo: match what it can, remainder is CANCELLED (market orders never rest)
        if (order.side === 'buy') {
            if (!this.bestAsk) {
                order.status = 'cancelled';
                // TODO : Send Acknowledgement to client
                console.log("Order Cancelled");
                return [];
            }

            const trades = this.matchAgainstBook(order);

            return trades;

            // this.lastPrice = trades[trades.length - 1].price;
        } else {
            if (!this.bestBid) {
                order.status = 'cancelled';
                console.log("Order Cancelled");
                // TODO : Send Acknowledgement to client
                return [];
            };

            const trades = this.matchAgainstBook(order);

            return trades;
        }
    }

    cancelOrder(orderId: string): boolean {
        const order = this.orderIndex.get(orderId);
        if (!order) return false;

        if (order.price !== null && order.price !== undefined) {
            const sideMap = order.side === 'buy' ? this.bids : this.asks;
            const queue = sideMap.get(order.price);
            if (queue) {
                const index = queue.findIndex(o => o.id === orderId);
                if (index !== -1) {
                    queue.splice(index, 1);
                    if (queue.length === 0) sideMap.delete(order.price);
                }
            }
        }

        order.status = 'cancelled';
        this.orderIndex.delete(orderId);
        this.updateBestPrices();
        return true;
    }

    getSpread(): number | undefined {
        if (this.bestBid !== null && this.bestAsk !== null) {
            return this.bestAsk - this.bestBid;
        }
        return undefined;
    }

    getDepth(levels: number): { bids: [price: number, totalQty: number][], asks: [price: number, totalQty: number][] } {
        const sortedBids = Array.from(this.bids.entries())
            .sort((a, b) => b[0] - a[0])
            .slice(0, levels)
            .map(([price, orders]) => [
                price,
                orders.reduce((sum, o) => sum + (o.remainingQuantity ?? 0), 0)
            ] as [number, number]);

        const sortedAsks = Array.from(this.asks.entries())
            .sort((a, b) => a[0] - b[0])
            .slice(0, levels)
            .map(([price, orders]) => [
                price,
                orders.reduce((sum, o) => sum + (o.remainingQuantity ?? 0), 0)
            ] as [number, number]);

        return { bids: sortedBids, asks: sortedAsks };
    }

    getSnapshot(): { bids: Order[], asks: Order[] } {
        const allBids = Array.from(this.bids.values()).flat();
        const allAsks = Array.from(this.asks.values()).flat();
        return { bids: allBids, asks: allAsks };
    }

    getOpenOrdersByUser(userId: string): Order[] {
        const result: Order[] = [];
        for (const order of this.orderIndex.values()) {
            if (order.userId === userId) {
                result.push(order);
            }
        }
        return result;
    }

    private updateBestPrices(): void {
        this.bestBid = this.bids.size > 0 ? Math.max(...this.bids.keys()) : null;
        this.bestAsk = this.asks.size > 0 ? Math.min(...this.asks.keys()) : null;
        console.log("Best Bid: ", this.bestBid);
        console.log("Best Ask: ", this.bestAsk);
    }

    // private
    private matchAgainstBook(incoming: Order): Trade[] {
        const trades: Trade[] = [];
        let oppositeSide = incoming.side === 'buy' ? this.asks : this.bids;
        incoming.remainingQuantity ??= incoming.quantity;

        while (incoming.remainingQuantity > 0 && this.hasMatchablePrice(oppositeSide, incoming)) {
            const bestPrice = this.getBestOppositePrice(oppositeSide);
            if (bestPrice === null) break;

            const queue = oppositeSide.get(bestPrice);
            if (!queue) break;

            while (queue.length > 0 && incoming.remainingQuantity > 0) {
                const resting = queue[0];
                if (!resting) break;
                resting.remainingQuantity ??= resting.quantity;

                const fillQty = Math.min(incoming.remainingQuantity, resting.remainingQuantity);

                trades.push(this.buildTrade(resting, incoming, bestPrice, fillQty));

                resting.remainingQuantity -= fillQty;
                incoming.remainingQuantity -= fillQty;

                //TODO: Flip Users Balances

                if (resting.remainingQuantity === 0) {
                    queue.shift();
                    if (resting.id) {
                        this.orderIndex.delete(resting.id);
                    }
                    //Send Acknowledgement to client order is filled
                }
            }
            if (queue.length === 0) oppositeSide.delete(bestPrice);
        }
        return trades;
    }


    // Helper Functions
    private hasMatchablePrice(oppositeSide: Map<number, Order[]>, incoming: Order): boolean {
        if (incoming.type === 'market') return oppositeSide.size > 0;
        if (!incoming.price) return false;
        const bestPrice = this.getBestOppositePrice(oppositeSide);
        return bestPrice !== null && (incoming.side === 'buy' ? bestPrice <= incoming.price : bestPrice >= incoming.price);
    }

    private getBestOppositePrice(oppositeSide: Map<number, Order[]>): number | null {
        if (oppositeSide.size === 0) return null;
        return oppositeSide === this.asks
            ? Math.min(...oppositeSide.keys())
            : Math.max(...oppositeSide.keys());
    }

    private buildTrade(maker: Order, taker: Order, price: number, qty: number): Trade {
        return {
            id: crypto.randomUUID(),
            market: this.market,
            price,
            quantity: qty,
            makerOrderId: maker.id ?? '',
            takerOrderId: taker.id ?? '',
            makerUserId: maker.userId,
            takerUserId: taker.userId,
            executedAt: Date.now(),
        };
    }
}