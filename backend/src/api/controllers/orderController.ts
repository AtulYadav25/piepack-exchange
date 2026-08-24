import type { FastifyReply, FastifyRequest } from "fastify";
import type { PlaceOrderRequest } from "../validators/order.schema.js";
import type { Market } from "../validators/order.schema.js";
import engine from "../engine.js";
import { tsPool } from "../../db/timescale.js";
import { prisma } from "../../db/prisma.js";

export const placeOrder = async (req: FastifyRequest<{ Body: PlaceOrderRequest }>, reply: FastifyReply) => {
    try {

        // Validate user - check JWT token
        if (!req.user || req.user.userId !== req.body.order.userId) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const { market, order } = req.body;
        if (!market) {
            return reply.status(400).send({ message: "Invalid market" })
        }
        if (market !== order.market) {
            return reply.status(400).send({ message: "Invalid Order" })
        }

        const result = engine.placeOrder(req.body);

        return reply.status(200).send(result)

    } catch (error) {
        console.log(error)
        return reply.status(400).send({ message: "Invalid order" })
    }
}

export const getOpenOrders = async (
    req: FastifyRequest<{ Querystring: { market: string } }>,
    reply: FastifyReply
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const { market } = req.query;
        if (!market) {
            return reply.status(400).send({ message: "market query param is required" });
        }

        const openOrders = engine.getOpenOrders(userId, market as Market);

        return reply.status(200).send({
            market,
            userId,
            openOrders,
            count: openOrders.length,
        });

    } catch (error) {
        console.log(error);
        return reply.status(400).send({ message: "Failed to fetch open orders" });
    }
}

/**
 * GET /order/history?market=BTC-USDC
 *
 * Returns the order history for the authenticated user in a market.
 */
export const getOrderHistory = async (
    req: FastifyRequest<{ Querystring: { market: string } }>,
    reply: FastifyReply
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const { market } = req.query;
        if (!market) {
            return reply.status(400).send({ message: "market query param is required" });
        }

        // Grab the latest event for each order_id (DISTINCT ON + ORDER BY timestamp DESC)
        const result = await tsPool.query(
            `SELECT DISTINCT ON (order_id)
                order_id,
                user_id,
                market,
                side,
                type,
                price,
                quantity,
                remaining_quantity,
                status,
                event_type,
                timestamp
             FROM orders
             WHERE user_id = $1 AND market = $2
             ORDER BY order_id, timestamp DESC
             LIMIT 200`,
            [userId, market.toUpperCase()]
        );

        const orders = result.rows.map((row) => ({
            id: row.order_id,
            market: row.market,
            side: row.side,
            type: row.type,
            price: row.price !== null ? parseFloat(row.price) : null,
            quantity: parseFloat(row.quantity),
            remainingQuantity: row.remaining_quantity !== null ? parseFloat(row.remaining_quantity) : null,
            status: row.status,
            timestamp: row.timestamp,
        }));

        // Sort newest first for display
        orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return reply.status(200).send({ market, userId, orders, count: orders.length });

    } catch (error) {
        console.error(error);
        return reply.status(500).send({ message: "Failed to fetch order history" });
    }
}

/**
 * GET /user/balances
 *
 * Returns the authenticated user's live asset balances from the in-memory
 * balance engine. Falls back to Prisma DB if user isn't loaded in memory yet.
 */
export const getBalances = async (
    req: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        // Try live in-memory engine first
        try {
            const balanceMap = engine.getBalances(userId);
            const balances: Record<string, { available: number; locked: number }> = {};
            for (const [asset, bal] of balanceMap.entries()) {
                balances[asset] = { available: bal.available, locked: bal.locked };
            }
            return reply.status(200).send({ userId, balances });
        } catch {
            // Not in memory yet — load from DB and try again
            await engine.upsertUserBalancesDb(userId);
            const balanceMap = engine.getBalances(userId);
            const balances: Record<string, { available: number; locked: number }> = {};
            for (const [asset, bal] of balanceMap.entries()) {
                balances[asset] = { available: bal.available, locked: bal.locked };
            }
            return reply.status(200).send({ userId, balances });
        }

    } catch (error) {
        console.error(error);
        try {
            const userId = req.user?.userId!;
            const dbBalances = await prisma.balance.findMany({ where: { userId } });
            const balances: Record<string, { available: number; locked: number }> = {};
            for (const b of dbBalances) {
                balances[b.asset] = { available: b.available, locked: b.locked };
            }
            return reply.status(200).send({ userId, balances });
        } catch (dbErr) {
            console.error(dbErr);
            return reply.status(500).send({ message: "Failed to fetch balances" });
        }
    }
}
