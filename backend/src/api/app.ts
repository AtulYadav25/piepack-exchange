import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { config } from './config/env.js';
import rateLimit from '@fastify/rate-limit';
import { errorHandler } from './middlewares/errorHandler.js';
import { jwtPlugin } from './plugins/jwt.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { authRoutes } from './routes/authRoutes.js';

const app = fastify({ logger: false });// TODO: Remove logger

const allowedOrigins: string[] = []; // TODO : Add real domain in production

if (config.NODE_ENV === 'PRODUCTION') {
    allowedOrigins.push('localhost:5173')
}

// ─── Plugins ───────────────────────────────────────────────────────────────────

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

// ─── Routes ────────────────────────────────────────────────────────────────────

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

//Chart Routes


export default app;
