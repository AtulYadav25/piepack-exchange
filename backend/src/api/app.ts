import fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { config } from './config/env.js';
import rateLimit from '@fastify/rate-limit';
import { errorHandler } from './middlewares/errorHandler.js';
import { orderRoutes } from './routes/orderRoutes.js';

const app = fastify({ logger: false });// TODO: Remove logger

const allowedOrigins = []; // TODO : Add real domain in production

if (config.NODE_ENV === 'PRODUCTION') {
    allowedOrigins.push('localhost:5173')
}

// TODO : Add Rate Limit
app.register(rateLimit, {
    max: 200,
    timeWindow: 60 * 1000,
    keyGenerator: (req) => req.ip,
});

// TODO : Add Cors

// TODO : Add Cookies

//Validators
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

//Error Handler
app.setErrorHandler(errorHandler);

app.get('/', async (req, reply) => {
    return reply.code(200).send({
        success: true,
        message: "Welcome to PiePack Exchange"
    })
})

app.register(orderRoutes, { prefix: "/api/v1/order" });

export default app;