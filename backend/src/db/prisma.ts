import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma v7 requires a driver adapter for database connections.
// PrismaPg wraps the pg pool and provides the connection to PrismaClient.
const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL']!,
});

// Singleton Prisma client — shared across the whole app.
// In development, prevents creating multiple connections during hot-reloads.
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env['NODE_ENV'] === 'DEVELOPMENT'
            ? ['query', 'warn', 'error']
            : ['warn', 'error'],
    });

if (process.env['NODE_ENV'] !== 'PRODUCTION') {
    globalForPrisma.prisma = prisma;
}
