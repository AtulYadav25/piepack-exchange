import { Kafka, logLevel } from "kafkajs";
import { config } from "../api/config/env.js";
import { TOPICS } from "./topics.js";

const brokers = config.KAFKA_BROKERS.split(",").map((b) => b.trim());

export const kafka = new Kafka({
  clientId: "tradeapp-backend",
  brokers,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

export const ensureTopicsExist = async (): Promise<void> => {
  const admin = kafka.admin();
  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();
    const requiredTopics = Object.values(TOPICS);
    const topicsToCreate = requiredTopics
      .filter((topic) => !existingTopics.includes(topic))
      .map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
      }));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true,
      });
      console.log(`[Kafka] Created missing topics: ${topicsToCreate.map((t) => t.topic).join(", ")}`);
    }
  } catch (error) {
    console.error("[Kafka] Failed to ensure topics exist:", error);
  } finally {
    await admin.disconnect();
  }
};
