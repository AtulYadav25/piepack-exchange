import type { FastifyInstance } from "fastify";
import { placeOrder } from '../controllers/orderController.js'
import { PlaceOrderRequestSchema } from "../validators/order.schema.js";

export const orderRoutes = async (app: FastifyInstance) => {

    //Open Order
    app.post('/placeOrder', { schema: { body: PlaceOrderRequestSchema } }, placeOrder);

}