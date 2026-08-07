import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const tsPool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 10,                // max pool connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

tsPool.on('error', (err) => {
    console.error('[TimescaleDB] Unexpected pool error:', err);
});

export const query = (text: string, params?: unknown[]) =>
    tsPool.query(text, params);
