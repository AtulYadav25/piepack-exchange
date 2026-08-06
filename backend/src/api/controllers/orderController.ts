import type { FastifyReply, FastifyRequest } from "fastify";
import type { PlaceOrderRequest } from "../validators/order.schema.js";
import engine from "../engine.js";


export const placeOrder = async (req: FastifyRequest<{ Body: PlaceOrderRequest }>, reply: FastifyReply) => {
    try {

        const { market } = req.body;
        if (!market) {
            return reply.status(400).send({ message: "Invalid market" })
        }

        // TODO : Validate User - Funds - User Tokens Available - Lock Funds for Order

        const result = engine.placeOrder(req.body);

        return reply.status(200).send(result)


    } catch (error) {
        console.log(error)
        return reply.status(400).send({ message: "Invalid order" })
    }
}