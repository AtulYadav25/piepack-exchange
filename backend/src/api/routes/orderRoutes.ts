import type { FastifyInstance } from "fastify";
import { placeOrder, getOpenOrders, getOrderHistory, getBalances } from '../controllers/orderController.js';
import { PlaceOrderRequestSchema } from "../validators/order.schema.js";
import { authenticate } from "../middlewares/authenticate.js";

export const orderRoutes = async (app: FastifyInstance) => {

    // Protect all order routes with JWT authentication (runs before schema validation)
    app.addHook('onRequest', authenticate);

    // Place Order
    app.post('/placeOrder', { schema: { body: PlaceOrderRequestSchema } }, placeOrder);

    // GET /order/openOrders?market=BTC-USDC — live resting orders from engine
    app.get('/openOrders', getOpenOrders);

    // GET /order/history?market=BTC-USDC — historical orders from TimescaleDB
    app.get('/history', getOrderHistory);

    // GET /order/balances — live balances from balance engine
    app.get('/balances', getBalances);

};