const { Kafka } = require("kafkajs");
require("dotenv").config();

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

const kafka = new Kafka({
  clientId: "availability-service",
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

// ✅ FIX: producer was never instantiated
const producer = kafka.producer();

const connectProducer = async () => {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected (availability-service)");
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

const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    console.log("✅ Kafka Producer Disconnected");
  } catch (err) {
    console.error("Error disconnecting producer:", err.message);
  }
};

// ============================================
// PUBLISH EVENTS
// ============================================
const publishEvent = async (eventType, data) => {
  try {
    const message = {
      eventName: eventType,
      timestamp: new Date().toISOString(),
      producerService: "availability-service",
      correlationId: data.userId || "system",
      payload: data,
    };

    await producer.send({
      topic: "availability-events",
      messages: [
        {
          key: data.userId || "availability-event",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "availability-service",
          },
        },
      ],
    });

    console.log("📤 Event published:", eventType);
    return message;
  } catch (err) {
    console.error("Error publishing event:", err.message);
    throw err;
  }
};

const publishAvailabilityEvent = async (eventType, data) => {
  try {
    const message = {
      eventName: eventType,
      timestamp: new Date().toISOString(),
      producerService: "availability-service",
      correlationId: data.userId || "system",
      payload: data,
    };

    // Publish to event-specific topic
    await producer.send({
      topic: eventType,
      messages: [
        {
          key: data.userId || "availability-event",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "availability-service",
          },
        },
      ],
    });

    // Also publish to shared topic
    await producer.send({
      topic: "availability-events",
      messages: [
        {
          key: data.userId || "availability-event",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "availability-service",
          },
        },
      ],
    });

    console.log("📤 Availability event published:", eventType);
    return message;
  } catch (err) {
    console.error("Error publishing availability event:", err.message);
    throw err;
  }
};

// ============================================
// INITIALIZATION & CLEANUP
// ============================================
const initKafka = connectProducer;

const closeKafka = disconnectProducer;

module.exports = {
  kafka,
  producer,
  connectProducer,
  disconnectProducer,
  initKafka,
  closeKafka,
  publishEvent,
  publishAvailabilityEvent,
};