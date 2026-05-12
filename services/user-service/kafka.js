import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "user-service",

  // ✅ multi-broker support (Aiven / Docker / cloud)
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim())
    : ["localhost:9092"],

  // ✅ Aiven SSL
  ssl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          rejectUnauthorized: false,
        }
      : false,

  // ✅ Aiven SASL
  sasl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          mechanism: "plain",
          username: process.env.KAFKA_USERNAME,
          password: process.env.KAFKA_PASSWORD,
        }
      : undefined,
});

const producer = kafka.producer();

// =========================
// CONNECT PRODUCER
// =========================
export const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("✅ Kafka producer connected (user-service)");
  } catch (err) {
    console.error("❌ Kafka producer connection failed:", err.message);
  }
};

// =========================
// SEND EVENT
// =========================
export const sendEvent = async (topic, data) => {
  try {
    console.log("📤 Sending event to Kafka:", topic);

    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            event: topic,
            timestamp: new Date().toISOString(),
            service: "user-service",
            payload: data,
          }),
        },
      ],
    });

    console.log("✅ Event sent successfully");
  } catch (err) {
    console.warn("⚠️ Kafka send failed (non-blocking):", err.message);
  }
};