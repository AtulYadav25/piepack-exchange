import type { FastifyInstance } from 'fastify';
import { register, login, logout } from '../controllers/authController.js';
import { RegisterSchema, LoginSchema } from '../validators/user.schema.js';

export const authRoutes = async (app: FastifyInstance) => {

    // POST /api/v1/auth/register
    app.post('/register', { schema: { body: RegisterSchema } }, register);

    // POST /api/v1/auth/login
    app.post('/login', { schema: { body: LoginSchema } }, login);

    // POST /api/v1/auth/logout
    app.post('/logout', logout);

};
