import { ensureTopicsExist } from "./client.js";
import { setupKafkaTables } from "./dbSetup.js";
import { startConsumer } from "./consumer.js";

export * from "./topics.js";
export * from "./client.js";
export * from "./producer.js";
export * from "./consumer.js";
export * from "./dbSetup.js";

export const initKafkaInfrastructure = async (): Promise<void> => {
  try {
    console.log("[Kafka Infra] Initializing Kafka infrastructure...");
    await ensureTopicsExist();
    await setupKafkaTables();
    await startConsumer();
    console.log("[Kafka Infra] Infrastructure initialization complete.");
  } catch (error) {
    console.error("[Kafka Infra] Initialization error:", error);
  }
};
