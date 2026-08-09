import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { config } from './config/env.js';
import fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { errorHandler } from './middlewares/errorHandler.js';
import { jwtPlugin } from './plugins/jwt.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { candleRoutes } from './routes/candleRoutes.js';

const app = fastify({ logger: false });// TODO: Remove logger

app.register(cors, {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
});

app.register(jwtPlugin);

app.register(rateLimit, {
    max: 200,
    timeWindow: 60 * 1000,
    keyGenerator: (req) => req.ip,
});

// TODO : Add Cors

//Validators
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

//Error Handler
app.setErrorHandler(errorHandler);

app.get('/', async (_req, reply) => {
    return reply.code(200).send({
        success: true,
        message: "Welcome to PiePack Exchange"
    })
})

// Auth routes (public)
app.register(authRoutes, { prefix: "/api/v1/auth" });

// Order routes (protected via preHandler inside orderRoutes)
app.register(orderRoutes, { prefix: "/api/v1/order" });

// Chart & Candle Routes (public: GET /api/v1/candles)
app.register(candleRoutes, { prefix: "/api/v1/chart" });

export default app;
