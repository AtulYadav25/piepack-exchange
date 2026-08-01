import type { Order, Trade } from "./types.js";

export class OrderBook {
    // price -> orders (FIFO)
    private bids: Map<number, Order[]> = new Map();
    private asks: Map<number, Order[]> = new Map();

    // For O(1) cancellation
    private orderIndex: Map<string, Order> = new Map();

    addLimitOrder(order: Order): Trade[] {
        // todo: match what it can, rest the remainder
        throw new Error("Method not implemented.");
    }

    addMarketOrder(order: Order): Trade[] {
        // todo: match what it can, remainder is CANCELLED (market orders never rest)
        throw new Error("Method not implemented.");
    }

    cancelOrder(orderId: string): boolean {
        // todo
        throw new Error("Method not implemented.");
    }

    getOrder(orderId: string): Order | undefined {
        // todo
        throw new Error("Method not implemented.");
    }

    getBestBid(): number | undefined {
        // todo
        throw new Error("Method not implemented.");
    }

    getBestAsk(): number | undefined {
        // todo
        throw new Error("Method not implemented.");
    }

    getSpread(): number | undefined {
        // todo
        throw new Error("Method not implemented.");
    }

    getDepth(levels: number): { bids: [price: number, totalQty: number][], asks: [price: number, totalQty: number][] } {
        // todo: for the snapshot endpoint / initial WS payload
        throw new Error("Method not implemented.");
    }

    getSnapshot(): { bids: Order[], asks: Order[] } {
        // todo: full book, mainly for debugging/tests
        throw new Error("Method not implemented.");
    }

    // private
    private matchAgainstBook(incoming: Order): Trade[] {
        // todo: the actual matching loop — walks the opposite side price-by-price, FIFO within a level, produces Trade[], mutates remainingQuantity on resting orders, removes fully-filled ones
        throw new Error("Method not implemented.");
    }
}