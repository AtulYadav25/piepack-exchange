import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import { config } from '../config/env.js';

export const jwtPlugin = fp(async (app: FastifyInstance) => {
    await app.register(fastifyCookie);
    await app.register(fastifyJwt, {
        secret: config.JWT_SECRET,
        cookie: {
            cookieName: 'token',
            signed: false,
        },
        sign: {
            expiresIn: '7d',
        },
    });
});
