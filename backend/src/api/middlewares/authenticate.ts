import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Auth middleware — use as a `preHandler` on any route that requires authentication.
 *
 * Verifies JWT token from `token` cookie or `Authorization: Bearer` header,
 * and attaches the decoded payload to `req.user`.
 */
export const authenticate = async (
    req: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({
            success: false,
            message: 'Unauthorized. Please log in.',
        });
    }
};
