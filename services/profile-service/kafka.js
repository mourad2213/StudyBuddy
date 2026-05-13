const { Kafka } = require("kafkajs");

// ============================================
// VALIDATE REQUIRED AIVEN CONFIGURATION
// ============================================
const validateKafkaConfig = () => {
  const brokers = process.env.KAFKA_BROKERS?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS environment variable is required (comma-separated: host1:9092,host2:9092)"
    );
  }

  if (!username || !password) {
    throw new Error(
      "KAFKA_USERNAME and KAFKA_PASSWORD environment variables are required for Aiven"
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

// ============================================
// KAFKA CLIENT - AIVEN ONLY
// ============================================
const kafka = new Kafka({
  clientId: "profile-service",
  brokers,

  ssl: true,
  sasl: {
    mechanism: "plain",
    username,
    password,
  },

  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

const producer = kafka.producer();

// ============================================
// PRODUCER CONNECTION
// ============================================
async function connectKafka() {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected (profile-service)");
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
}

// ============================================
// SEND EVENT
// ============================================
async function sendEvent(eventName, payload) {
  const message = {
    eventName,
    event: eventName, // keep this for services that use "event"
    timestamp: new Date().toISOString(),
    service: "profile-service",
    producerService: "profile-service",
    correlationId: payload.userId || "system",
    payload,
  };

  // Send to the specific topic matching-service listens to
  await producer.send({
    topic: eventName,
    messages: [
      {
        value: JSON.stringify(message),
      },
    ],
  });

  // Also keep sending to study-events for notification/messaging services
  await producer.send({
    topic: "study-events",
    messages: [
      {
        value: JSON.stringify(message),
      },
    ],
  });
  console.log("📤 Event sent to Kafka:", eventName);
}

// ============================================
// DISCONNECT PRODUCER
// ============================================
async function disconnectKafka() {
  try {
    await producer.disconnect();
    console.log("✅ Kafka Producer Disconnected");
  } catch (err) {
    console.error("❌ Error disconnecting Kafka producer:", err);
  }
}

module.exports = { kafka, producer, connectKafka, disconnectKafka, sendEvent };