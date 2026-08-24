import type { FastifyReply, FastifyRequest } from "fastify";
import type { PlaceOrderRequest } from "../validators/order.schema.js";
import type { Market } from "../validators/order.schema.js";
import engine from "../engine.js";


export const placeOrder = async (req: FastifyRequest<{ Body: PlaceOrderRequest }>, reply: FastifyReply) => {
    try {

        // Validate user - check JWT token
        if (!req.user || req.user.userId !== req.body.order.userId) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const { market } = req.body;
        if (!market) {
            return reply.status(400).send({ message: "Invalid market" })
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