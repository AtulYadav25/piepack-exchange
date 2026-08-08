import type { Producer } from "kafkajs";
import { kafka } from "./client.js";
import {
  TOPICS,
  type Event,
  type OrderEventPayload,
  type TradeEventPayload,
  type BalanceEventPayload,
} from "./topics.js";

let producer: Producer | null = null;

export const getProducer = async (): Promise<Producer> => {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await producer.connect();
    console.log("[Kafka Producer] Connected successfully.");
  }
  return producer;
};

export const disconnectProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log("[Kafka Producer] Disconnected.");
  }
};

export const produceEvent = async <T>(
  topic: string,
  eventType: string,
  data: T,
  key?: string
): Promise<void> => {
  try {
    let p = await getProducer();
    const event: Event<T> = {
      eventId: crypto.randomUUID(),
      eventType,
      version: 1,
      timestamp: Date.now(),
      data,
    };

    try {
      await p.send({
        topic,
        messages: [
          {
            key: key || event.eventId,
            value: JSON.stringify(event),
          },
        ],
      });
    } catch (err: any) {
      if (err?.name === "KafkaJSError" && err?.message?.includes("disconnected")) {
        console.warn("[Kafka Producer] Producer disconnected, reconnecting...");
        producer = null;
        p = await getProducer();
        await p.send({
          topic,
          messages: [
            {
              key: key || event.eventId,
              value: JSON.stringify(event),
            },
          ],
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error(`[Kafka Producer] Failed to produce event ${eventType} on topic ${topic}:`, error);
  }
};

export const produceOrderEvent = (eventType: string, data: OrderEventPayload): Promise<void> => {
  return produceEvent(TOPICS.ORDERS, eventType, data, data.userId);
};

export const produceTradeEvent = (eventType: string, data: TradeEventPayload): Promise<void> => {
  return produceEvent(TOPICS.TRADES, eventType, data, data.market);
};

export const produceBalanceEvent = (eventType: string, data: BalanceEventPayload): Promise<void> => {
  return produceEvent(TOPICS.BALANCES, eventType, data, data.userId);
};
