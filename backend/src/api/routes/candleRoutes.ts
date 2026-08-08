import type { FastifyInstance } from 'fastify';
import { getCandles } from '../controllers/candleController.js';
import { CandleQuerySchema } from '../validators/candle.schema.js';

export const candleRoutes = async (app: FastifyInstance) => {
  // GET /api/v1/chart/candles
  app.get('/candles', { schema: { querystring: CandleQuerySchema } }, getCandles);
};
