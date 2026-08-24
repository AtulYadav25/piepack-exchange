import type { Market } from "./config.js";
import { SUPPORTED_MARKETS } from "./config.js";
import { BalanceEngine } from "./balances/balanceEngine.js";
import { MarketEngine } from "./markets/MarketEngine.js";
import type { PlaceOrderRequest } from "./types.js";
import { produceOrderEvent, ORDER_EVENT_TYPES } from "../kafka-infrastructure/index.js";


export class ExchangeEngine {

    private balanceEngine = new BalanceEngine();
    private markets = new Map<Market, MarketEngine>();

    constructor() {
        for (const m of SUPPORTED_MARKETS) {
            this.markets.set(m, new MarketEngine(m, this.balanceEngine));
        }
    }

    /**
     * Seed default asset balances for a user.
     * Call this after login or registration (idempotent).
     */
    upsertUserBalances(userId: string): void {
        this.balanceEngine.upsertUser(userId);
    }

    /**
     * Asynchronously loads user balances from DB into memory (and seeds missing defaults in DB).
     */
    async upsertUserBalancesDb(userId: string): Promise<void> {
        await this.balanceEngine.upsertUserDb(userId);
    }

    /**
     * Flushes dirty in-memory balance changes to PostgreSQL database via Prisma.
     */
    async flushBalances(): Promise<void> {
        await this.balanceEngine.flushToDb();
    }

    // ── Order placement ────────────────────────────────────────────────────

    placeOrder(req: PlaceOrderRequest): void {
        const market = this.markets.get(req.market);
        if (!market) throw new Error("Invalid market");

        // 1. Ensure the user exists in the balance engine
        this.balanceEngine.upsertUser(req.userId);

        // 2. Validate the user has enough available funds
        this.balanceEngine.validateFunds(req.order);

        // 3. Lock the required funds before sending to the order book
        this.balanceEngine.lockFunds(req.order);

        // 4. Produce ORDER_CREATED event
        produceOrderEvent(ORDER_EVENT_TYPES.CREATED, {
            orderId: req.order.id || crypto.randomUUID(),
            userId: req.userId,
            market: req.market,
            side: req.order.side,
            type: req.order.type,
            price: req.order.price,
            quantity: req.order.quantity,
            remainingQuantity: req.order.remainingQuantity ?? req.order.quantity,
            status: req.order.status || 'open',
        }).catch((err) => console.error("Failed to produce ORDER_CREATED event:", err));

        // 5. Send to market engine (funds are consumed inside on match)
        market.placeUserOrder(req);

        // 6. Asynchronously flush dirty balances to DB (non-blocking)
        this.balanceEngine.flushToDb().catch((err) =>
            console.error("Failed to flush balances to DB:", err)
        );
    }

    getOpenOrders(userId: string, market: Market) {
        return this.markets.get(market)?.getOpenOrders(userId) ?? [];
    }

    cancelOrder(userId: string, marketSymbol: Market, orderId: string): void {
        produceOrderEvent(ORDER_EVENT_TYPES.CANCELLED, {
            orderId,
            userId,
            market: marketSymbol,
            side: 'buy', // placeholder
            type: 'limit', // placeholder
            quantity: 0,
            status: 'cancelled',
        }).catch((err) => console.error("Failed to produce ORDER_CANCELLED event:", err));
    }

}