import { ALL_ASSETS, DEFAULT_BALANCES, getMarketAssets } from '../config.js';
import type { Asset } from '../config.js';
import type { Order, Trade } from '../types.js';
import { prisma } from '../../db/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Balance {
    available: number;
    locked:    number;
}

/** In-memory snapshot of every user's asset balances */
type BalanceMap = Map<string, Map<Asset, Balance>>;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class BalanceEngine {

    private balances: BalanceMap = new Map();
    private dirtyUsers: Set<string> = new Set();

    // ── Initialisation ──────────────────────────────────────────────────────

    /**
     * Synchronous in-memory seed (called when initializing memory state).
     */
    upsertUser(userId: string): void {
        if (!this.balances.has(userId)) {
            this.balances.set(userId, new Map());
        }

        const userBalances = this.balances.get(userId)!;

        for (const asset of ALL_ASSETS) {
            if (!userBalances.has(asset)) {
                userBalances.set(asset, {
                    available: DEFAULT_BALANCES[asset],
                    locked:    0,
                });
            }
        }
    }

    /**
     * Asynchronous DB-hydrating upsert.
     * Loads user balances from PostgreSQL into memory.
     * If no records exist in DB for an asset, creates default records in both DB & memory.
     */
    async upsertUserDb(userId: string): Promise<void> {
        this.upsertUser(userId);

        try {
            const dbBalances = await prisma.balance.findMany({
                where: { userId },
            });

            const userBalances = this.balances.get(userId)!;

            // Load existing records from DB into memory
            for (const record of dbBalances) {
                userBalances.set(record.asset as Asset, {
                    available: record.available,
                    locked: record.locked,
                });
            }

            // For missing assets, persist the default balance to DB
            for (const asset of ALL_ASSETS) {
                const hasInDb = dbBalances.some((b) => b.asset === asset);
                if (!hasInDb) {
                    const b = userBalances.get(asset)!;
                    await prisma.balance.upsert({
                        where: { userId_asset: { userId, asset } },
                        update: {},
                        create: {
                            userId,
                            asset,
                            available: b.available,
                            locked: b.locked,
                        },
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to sync balances from DB for user ${userId}:`, error);
        }
    }

    /**
     * Persist in-memory balances for a specific user to PostgreSQL.
     */
    async persistUserBalances(userId: string): Promise<void> {
        const userBalances = this.balances.get(userId);
        if (!userBalances) return;

        const operations = Array.from(userBalances.entries()).map(([asset, balance]) =>
            prisma.balance.upsert({
                where: { userId_asset: { userId, asset } },
                update: {
                    available: balance.available,
                    locked: balance.locked,
                },
                create: {
                    userId,
                    asset,
                    available: balance.available,
                    locked: balance.locked,
                },
            }),
        );

        await prisma.$transaction(operations);
        this.dirtyUsers.delete(userId);
    }

    /**
     * Flush all dirty (modified) user balances to PostgreSQL.
     * Can be called periodically or after matching cycles.
     */
    async flushToDb(): Promise<void> {
        if (this.dirtyUsers.size === 0) return;
        const usersToFlush = Array.from(this.dirtyUsers);
        for (const userId of usersToFlush) {
            await this.persistUserBalances(userId);
        }
    }

    // ── Read ────────────────────────────────────────────────────────────────

    /** Returns a snapshot of all balances for a user (throws if unknown). */
    getUserBalances(userId: string): Map<Asset, Balance> {
        const userBalances = this.balances.get(userId);
        if (!userBalances) throw new Error(`User ${userId} not found in balance engine`);
        return userBalances;
    }

    /** Returns a single asset balance for a user (throws if unknown). */
    getBalance(userId: string, asset: Asset): Balance {
        const b = this.getUserBalances(userId).get(asset);
        if (!b) throw new Error(`Asset ${asset} not found for user ${userId}`);
        return b;
    }

    // ── Fund lifecycle ──────────────────────────────────────────────────────

    /**
     * Validate that the user has enough available funds for the order.
     * - buy  → needs `price * quantity` of the **quote** asset (e.g. USDC)
     * - sell → needs `quantity` of the **base** asset (e.g. BTC)
     *
     * Throws an error (caught by ExchangeEngine) when insufficient.
     */
    validateFunds(order: Order): void {
        const { userId, market, side, price, quantity } = order;

        this.ensureUser(userId);

        const [base, quote] = getMarketAssets(market as any);

        if (side === 'buy') {
            // For a market buy we don't know the exact price; skip strict check.
            if (price == null) return;

            const required = price * quantity;
            const balance  = this.getBalance(userId, quote);

            if (balance.available < required) {
                throw new Error(
                    `Insufficient ${quote}: need ${required}, have ${balance.available} available`,
                );
            }
        } else {
            const balance = this.getBalance(userId, base);

            if (balance.available < quantity) {
                throw new Error(
                    `Insufficient ${base}: need ${quantity}, have ${balance.available} available`,
                );
            }
        }
    }

    /**
     * Move funds from `available` → `locked` before sending the order to the
     * market engine.
     */
    lockFunds(order: Order): void {
        const { userId, market, side, price, quantity } = order;

        this.ensureUser(userId);

        const [base, quote] = getMarketAssets(market as any);

        if (side === 'buy') {
            if (price == null) return; // market buy – nothing to pre-lock
            const amount  = price * quantity;
            const balance = this.getBalance(userId, quote);
            balance.available -= amount;
            balance.locked    += amount;
        } else {
            const balance = this.getBalance(userId, base);
            balance.available -= quantity;
            balance.locked    += quantity;
        }

        this.dirtyUsers.add(userId);
    }

    /**
     * Consume exactly the matched amount from the `locked` bucket after a trade.
     * - maker (sell) → deduct base from locked, credit quote available
     * - taker (buy)  → deduct quote from locked, credit base available
     */
    consumeFunds(trade: Trade, makerOrder: Order, takerOrder: Order): void {
        const [base, quote] = getMarketAssets(trade.market as any);

        const { makerUserId, takerUserId, price, quantity } = trade;
        const quoteAmount = price * quantity;

        // Maker is always a sell (resting limit order on the ask side)
        const makerBalance = this.getUserBalances(makerUserId);
        const makerBase    = makerBalance.get(base)!;
        const makerQuote   = makerBalance.get(quote)!;

        makerBase.locked    -= quantity;   // locked base consumed
        makerQuote.available += quoteAmount; // receive quote

        // Taker is always a buy (incoming order hitting the book)
        const takerBalance = this.getUserBalances(takerUserId);
        const takerBase    = takerBalance.get(base)!;
        const takerQuote   = takerBalance.get(quote)!;

        takerQuote.locked   -= quoteAmount; // locked quote consumed
        takerBase.available += quantity;    // receive base

        this.dirtyUsers.add(makerUserId);
        this.dirtyUsers.add(takerUserId);
    }

    /**
     * Release all locked funds back to available (e.g. on order cancel or
     * partial fill where remaining qty is unlocked).
     */
    releaseFunds(order: Order, amount?: number): void {
        const { userId, market, side, price, quantity, remainingQuantity } = order;

        this.ensureUser(userId);

        const [base, quote] = getMarketAssets(market as any);
        const releaseQty    = amount ?? remainingQuantity ?? quantity;

        if (side === 'buy') {
            if (price == null) return;
            const releaseAmount  = price * releaseQty;
            const balance        = this.getBalance(userId, quote);
            balance.locked      -= releaseAmount;
            balance.available   += releaseAmount;
        } else {
            const balance       = this.getBalance(userId, base);
            balance.locked     -= releaseQty;
            balance.available  += releaseQty;
        }

        this.dirtyUsers.add(userId);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private ensureUser(userId: string): void {
        if (!this.balances.has(userId)) {
            // Auto-seed new users so orders don't hard-crash;
            // a proper user should have been upserted at login.
            this.upsertUser(userId);
        }
    }
}