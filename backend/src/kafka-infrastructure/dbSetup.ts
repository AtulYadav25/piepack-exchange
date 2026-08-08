import { tsPool } from "../db/timescale.js";

export const setupKafkaTables = async (): Promise<void> => {
  const client = await tsPool.connect();
  try {
    // 1. Ensure TimescaleDB extension is active
    await client.query("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;");

    // 2. Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        event_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        market VARCHAR(32) NOT NULL,
        side VARCHAR(10) NOT NULL,
        type VARCHAR(10) NOT NULL,
        price NUMERIC,
        quantity NUMERIC NOT NULL,
        remaining_quantity NUMERIC,
        status VARCHAR(20) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
    `);

    // 3. Trades Hypertable (TimescaleDB)
    await client.query(`
      CREATE TABLE IF NOT EXISTS trades (
        event_id VARCHAR(64) NOT NULL,
        trade_id VARCHAR(64) NOT NULL,
        market VARCHAR(32) NOT NULL,
        price NUMERIC NOT NULL,
        quantity NUMERIC NOT NULL,
        maker_order_id VARCHAR(64) NOT NULL,
        taker_order_id VARCHAR(64) NOT NULL,
        maker_user_id VARCHAR(64) NOT NULL,
        taker_user_id VARCHAR(64) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (trade_id, timestamp)
      );
    `);

    // Create hypertable on timestamp column if not already converted
    await client.query(`
      SELECT create_hypertable('trades', by_range('timestamp'), if_not_exists => TRUE);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_market_time ON trades (market, timestamp DESC);
    `);

    // 4. Balances Events Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS balance_events (
        event_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        asset VARCHAR(16) NOT NULL,
        available NUMERIC NOT NULL,
        locked NUMERIC NOT NULL,
        amount NUMERIC,
        event_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_balance_events_user_id ON balance_events (user_id);
    `);

    console.log("[Kafka DB] Successfully verified/created orders, trades (hypertable), and balance_events tables.");
  } catch (error) {
    console.error("[Kafka DB] Error setting up database tables:", error);
  } finally {
    client.release();
  }
};
