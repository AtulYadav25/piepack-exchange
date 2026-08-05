import type { FastifyReply, FastifyRequest } from "fastify";
import type { PlaceOrderRequest } from "../validators/order.schema.js";


export const placeOrder = async (req: FastifyRequest<{ Body: PlaceOrderRequest }>, reply: FastifyReply) => {
    try {

        const { market } = req.body;
        if (!market) {
            return reply.status(400).send({ message: "Invalid market" })
        }

        // TODO : Place Order!

        return reply.status(200).send({ message: "Order placed successfully" })


    } catch (error) {

    }
}