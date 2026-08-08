import type { Consumer, EachBatchPayload } from "kafkajs";
import { kafka } from "./client.js";
import { TOPICS, type Event, type OrderEventPayload, type TradeEventPayload, type BalanceEventPayload } from "./topics.js";
import { tsPool } from "../db/timescale.js";

let consumer: Consumer | null = null;

// ─── Bulk SQL Helpers ─────────────────────────────────────────────────────────

const bulkInsertOrders = async (events: Event<OrderEventPayload>[]): Promise<void> => {
  if (events.length === 0) return;

  const values: unknown[] = [];
  const valueStrings: string[] = [];

  events.forEach((ev, i) => {
    const idx = i * 12;
    valueStrings.push(
      `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11}, $${idx + 12})`
    );
    values.push(
      ev.eventId,
      ev.data.orderId,
      ev.data.userId,
      ev.data.market,
      ev.data.side,
      ev.data.type,
      ev.data.price ?? null,
      ev.data.quantity,
      ev.data.remainingQuantity ?? null,
      ev.data.status,
      ev.eventType,
      new Date(ev.timestamp)
    );
  });

  const queryText = `
    INSERT INTO orders (
      event_id, order_id, user_id, market, side, type, price, quantity, remaining_quantity, status, event_type, timestamp
    )
    VALUES ${valueStrings.join(", ")}
    ON CONFLICT (event_id) DO NOTHING;
  `;

  await tsPool.query(queryText, values);
  console.log(`[Kafka Consumer DB] Bulk inserted ${events.length} order events into orders table.`);
};

const bulkInsertTrades = async (events: Event<TradeEventPayload>[]): Promise<void> => {
  if (events.length === 0) return;

  const values: unknown[] = [];
  const valueStrings: string[] = [];

  events.forEach((ev, i) => {
    const idx = i * 11;
    valueStrings.push(
      `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11})`
    );
    values.push(
      ev.eventId,
      ev.data.tradeId,
      ev.data.market,
      ev.data.price,
      ev.data.quantity,
      ev.data.makerOrderId,
      ev.data.takerOrderId,
      ev.data.makerUserId,
      ev.data.takerUserId,
      ev.eventType,
      new Date(ev.timestamp)
    );
  });

  const queryText = `
    INSERT INTO trades (
      event_id, trade_id, market, price, quantity, maker_order_id, taker_order_id, maker_user_id, taker_user_id, event_type, timestamp
    )
    VALUES ${valueStrings.join(", ")}
    ON CONFLICT (trade_id, timestamp) DO NOTHING;
  `;

  await tsPool.query(queryText, values);
  console.log(`[Kafka Consumer DB] Bulk inserted ${events.length} trade events into trades hypertable.`);
};

const bulkInsertBalances = async (events: Event<BalanceEventPayload>[]): Promise<void> => {
  if (events.length === 0) return;

  const values: unknown[] = [];
  const valueStrings: string[] = [];

  events.forEach((ev, i) => {
    const idx = i * 8;
    valueStrings.push(
      `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`
    );
    values.push(
      ev.eventId,
      ev.data.userId,
      ev.data.asset,
      ev.data.available,
      ev.data.locked,
      ev.data.amount ?? null,
      ev.eventType,
      new Date(ev.timestamp)
    );
  });

  const queryText = `
    INSERT INTO balance_events (
      event_id, user_id, asset, available, locked, amount, event_type, timestamp
    )
    VALUES ${valueStrings.join(", ")}
    ON CONFLICT (event_id) DO NOTHING;
  `;

  await tsPool.query(queryText, values);
  console.log(`[Kafka Consumer DB] Bulk inserted ${events.length} balance events into balance_events table.`);
};

// ─── Batch Processor ──────────────────────────────────────────────────────────

const processBatch = async ({ batch, resolveOffset, heartbeat, isRunning, isStale }: EachBatchPayload): Promise<void> => {
  const orderEvents: Event<OrderEventPayload>[] = [];
  const tradeEvents: Event<TradeEventPayload>[] = [];
  const balanceEvents: Event<BalanceEventPayload>[] = [];

  for (const message of batch.messages) {
    if (!isRunning() || isStale()) break;

    if (!message.value) continue;

    try {
      const parsed = JSON.parse(message.value.toString());

      if (batch.topic === TOPICS.ORDERS) {
        orderEvents.push(parsed as Event<OrderEventPayload>);
      } else if (batch.topic === TOPICS.TRADES) {
        tradeEvents.push(parsed as Event<TradeEventPayload>);
      } else if (batch.topic === TOPICS.BALANCES) {
        balanceEvents.push(parsed as Event<BalanceEventPayload>);
      }

      resolveOffset(message.offset);
    } catch (err) {
      console.error(`[Kafka Consumer] Failed to parse message at offset ${message.offset}:`, err);
    }
  }

  // Execute bulk idempotent database insertions per batch
  if (orderEvents.length > 0) {
    await bulkInsertOrders(orderEvents);
  }
  if (tradeEvents.length > 0) {
    await bulkInsertTrades(tradeEvents);
  }
  if (balanceEvents.length > 0) {
    await bulkInsertBalances(balanceEvents);
  }

  await heartbeat();
};

// ─── Consumer Lifecycle ───────────────────────────────────────────────────────

export const startConsumer = async (): Promise<void> => {
  try {
    if (!consumer) {
      consumer = kafka.consumer({
        groupId: "tradeapp-db-batch-consumer",
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });
      await consumer.connect();
      console.log("[Kafka Consumer] Connected successfully.");

      await consumer.subscribe({
        topics: [TOPICS.ORDERS, TOPICS.TRADES, TOPICS.BALANCES],
        fromBeginning: true,
      });

      await consumer.run({
        eachBatchAutoResolve: true,
        eachBatch: processBatch,
      });

      console.log("[Kafka Batch Consumer] Subscribed & processing batches.");
    }
  } catch (error) {
    console.error("[Kafka Consumer] Failed to start consumer:", error);
  }
};

export const stopConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log("[Kafka Consumer] Disconnected.");
  }
};
