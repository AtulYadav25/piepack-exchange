import { tsPool } from "../db/timescale.js";

export const setupKafkaTables = async (): Promise<void> => {
  const client = await tsPool.connect();
  try {
    // 1. Ensure TimescaleDB extension is active
    await client.query("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;");

    // 2. Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kafka_orders (
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
      CREATE INDEX IF NOT EXISTS idx_kafka_orders_user_id ON kafka_orders (user_id);
    `);

    // 3. Trades Hypertable (TimescaleDB)
    await client.query(`
      CREATE TABLE IF NOT EXISTS kafka_trades (
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
      SELECT create_hypertable('kafka_trades', by_range('timestamp'), if_not_exists => TRUE);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kafka_trades_market_time ON kafka_trades (market, timestamp DESC);
    `);

    // 4. Balances Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kafka_balance_events (
        event_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        asset VARCHAR(16) NOT NULL,
        available NUMERIC NOT NULL,
        locked NUMERIC NOT NULL,
        amount NUMERIC,
        event_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kafka_balances_user_id ON kafka_balance_events (user_id);
    `);

    console.log("[Kafka DB] Successfully verified/created orders, trades (hypertable), and balance tables.");
  } catch (error) {
    console.error("[Kafka DB] Error setting up database tables:", error);
  } finally {
    client.release();
  }
};
