-- ============================================================
-- TimescaleDB Initialization Script
-- Run once after the container starts (or as a migration step).
-- ============================================================

-- 1. Enable the TimescaleDB extension (idempotent)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================================
-- Hypertable stubs — uncomment and adapt when ready.
-- ============================================================

-- Example: trades hypertable
-- CREATE TABLE IF NOT EXISTS trades (
--     id          UUID        NOT NULL,
--     market      TEXT        NOT NULL,
--     price       NUMERIC     NOT NULL,
--     quantity    NUMERIC     NOT NULL,
--     side        TEXT        NOT NULL CHECK (side IN ('BUY', 'SELL')),
--     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- SELECT create_hypertable('trades', by_range('created_at'), if_not_exists => TRUE);
-- CREATE INDEX IF NOT EXISTS idx_trades_market ON trades (market, created_at DESC);

-- Example: candles hypertable (OHLCV)
-- CREATE TABLE IF NOT EXISTS candles (
--     market      TEXT        NOT NULL,
--     interval    TEXT        NOT NULL,  -- e.g. '1m', '5m', '1h'
--     open_time   TIMESTAMPTZ NOT NULL,
--     open        NUMERIC     NOT NULL,
--     high        NUMERIC     NOT NULL,
--     low         NUMERIC     NOT NULL,
--     close       NUMERIC     NOT NULL,
--     volume      NUMERIC     NOT NULL,
--     PRIMARY KEY (market, interval, open_time)
-- );
-- SELECT create_hypertable('candles', by_range('open_time'), if_not_exists => TRUE);
