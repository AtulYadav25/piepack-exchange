import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Raw SQL connection pool for TimescaleDB-specific queries
// (hypertables, candles, time-series aggregations, etc.).
// Uses the same DATABASE_URL as Prisma — one container, one database.
export const tsPool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 10,                // max pool connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

tsPool.on('error', (err) => {
    console.error('[TimescaleDB] Unexpected pool error:', err);
});

/**
 * Helper for one-off raw queries.
 * Usage: const { rows } = await query('SELECT ...', [param1, param2]);
 */
export const query = (text: string, params?: unknown[]) =>
    tsPool.query(text, params);
