import { Kafka } from "kafkajs";

// ============================================
// VALIDATE & CONFIGURE KAFKA
// ============================================
const validateKafkaConfig = () => {
  const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER)?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS (or KAFKA_BROKER) environment variable is required (comma-separated: host1:9092,host2:9092)"
    );
  }

  return { brokers, username, password };
};

const { brokers: brokerString, username, password } = validateKafkaConfig();
const brokers = brokerString
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No valid brokers found after parsing KAFKA_BROKERS");
}

const kafkaConfig = {
  clientId: "user-service",
  brokers,

  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
};

if (username && password) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: "plain",
    username,
    password,
  };
}

const kafka = new Kafka(kafkaConfig);

const producer = kafka.producer();

// ============================================
// CONNECT PRODUCER
// ============================================
export const connectProducer = async () => {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka producer connected (user-service)");
      return;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Producer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Producer failed to connect to Kafka after retries");
        throw new Error("Failed to connect Kafka producer");
      }
    }
  }
};

// ============================================
// DISCONNECT PRODUCER
// ============================================
export const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    console.log("✅ Kafka producer disconnected");
  } catch (err) {
    console.error("Error disconnecting producer:", err.message);
  }
};

// ============================================
// SEND EVENT
// ============================================
export const sendEvent = async (topic, data) => {
  try {
    console.log("📤 Sending event to Kafka:", topic);

    const message = {
      event: topic,
      timestamp: new Date().toISOString(),
      service: "user-service",
      payload: data,
    };

    await producer.send({
      topic,
      messages: [
        {
          key: data.userId || "user-event",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "user-service",
          },
        },
      ],
    });

    console.log("✅ Event sent successfully");
    return message;
  } catch (err) {
    console.warn("⚠️ Kafka send failed (non-blocking):", err.message);
    throw err;
  }
};

// ============================================
// EXPORTS
// ============================================
export { kafka, producer };
