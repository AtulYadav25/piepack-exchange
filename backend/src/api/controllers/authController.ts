import type { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';
import type { RegisterInput, LoginInput } from '../validators/user.schema.js';
import engine from '../engine.js';

const BCRYPT_ROUNDS = 12;

const setAuthCookieAndToken = (req: FastifyRequest, reply: FastifyReply, userId: string, email: string) => {
    const token = req.server.jwt.sign({ userId, email });

    reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'PRODUCTION',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return token;
};

export const register = async (
    req: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply,
) => {
    const { email, password, name } = req.body;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return reply.status(409).send({
            success: false,
            message: 'An account with this email already exists.',
        });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const username = name?.toLowerCase().trim() || email;

    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name: name || username },
        select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = setAuthCookieAndToken(req, reply, user.id, user.email);

    // Seed default asset balances in DB and in-memory engine
    await engine.upsertUserBalancesDb(user.id);

    return reply.status(201).send({
        success: true,
        message: 'Account created successfully.',
        data: {
            user,
            token,
        },
    });
};

export const login = async (
    req: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply,
) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return reply.status(401).send({
            success: false,
            message: 'Invalid email or password.',
        });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return reply.status(401).send({
            success: false,
            message: 'Invalid email or password.',
        });
    }

    const token = setAuthCookieAndToken(req, reply, user.id, user.email);

    // Refresh in-memory balances from DB on every login
    await engine.upsertUserBalancesDb(user.id);

    return reply.status(200).send({
        success: true,
        message: 'Login successful.',
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token,
        },
    });
};

export const logout = async (
    _req: FastifyRequest,
    reply: FastifyReply,
) => {
    reply.clearCookie('token', { path: '/' });
    return reply.status(200).send({
        success: true,
        message: 'Logged out successfully.',
    });
};
