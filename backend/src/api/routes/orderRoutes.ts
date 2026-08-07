import type { FastifyInstance } from "fastify";
import { placeOrder } from '../controllers/orderController.js';
import { PlaceOrderRequestSchema } from "../validators/order.schema.js";
import { authenticate } from "../middlewares/authenticate.js";

export const orderRoutes = async (app: FastifyInstance) => {

    // Protect all order routes with JWT authentication (runs before schema validation)
    app.addHook('onRequest', authenticate);

    // Open Order
    app.post('/placeOrder', { schema: { body: PlaceOrderRequestSchema } }, placeOrder);

};