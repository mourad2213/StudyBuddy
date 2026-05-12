import { Kafka, logLevel } from "kafkajs";

// ==============================
// VALIDATE REQUIRED AIVEN CONFIGURATION
// ==============================
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

// ==============================
// KAFKA CLIENT (AIVEN ONLY)
// ==============================
const kafka = new Kafka({
  clientId: "messaging-service",
  brokers,

  logLevel: logLevel.INFO,

  // ✅ ALWAYS use SSL for Aiven
  ssl: true,

  // ✅ ALWAYS use SASL plain for Aiven
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

// ==============================
// PRODUCER + CONSUMER
// ==============================
const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: "messaging-service-group",
});

// ==============================
// CONNECT PRODUCER
// ==============================
export async function connectProducer() {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected (messaging-service)");
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

// ==============================
// CONNECT CONSUMER
// ==============================
export async function connectConsumer() {
  let retries = 10;

  while (retries > 0) {
    try {
      await consumer.connect();
      console.log("✅ Kafka Consumer Connected (messaging-service)");
      return;
    } catch (err) {
      retries--;

      console.log(
        `⏳ Consumer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);

      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Consumer failed to connect to Kafka after retries");
        throw new Error("Failed to connect Kafka consumer");
      }
    }
  }
}

// ==============================
// SUBSCRIBE TO EVENTS
// ==============================
export async function subscribeToEvents(callback) {
  await consumer.subscribe({
    topic: "study-events",
    fromBeginning: false,
  });

  await consumer.subscribe({
    topic: "BuddyRequestCreated",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());

        console.log(`📩 Kafka message from ${topic}:`, event);

        await callback(event);
      } catch (err) {
        console.error("❌ Kafka message processing error:", err.message);
      }
    },
  });
}

// ==============================
// SEND EVENT
// ==============================
export async function sendEvent(eventName, payload) {
  try {
    const message = {
      event: eventName,
      timestamp: new Date().toISOString(),
      service: "messaging-service",
      payload,
    };

    await producer.send({
      topic: "study-events",
      messages: [
        {
          key: payload.userId || "messaging-event",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "messaging-service",
          },
        },
      ],
    });

    console.log("📤 Event sent to Kafka:", eventName);
    return message;
  } catch (err) {
    console.error("❌ Kafka send failed:", err.message);
    throw err;
  }
}

// ==============================
// CLEANUP
// ==============================
export async function disconnectProducer() {
  try {
    await producer.disconnect();
    console.log("✅ Producer disconnected");
  } catch (err) {
    console.error("❌ Producer disconnect error:", err.message);
  }
}

export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    console.log("✅ Consumer disconnected");
  } catch (err) {
    console.error("❌ Consumer disconnect error:", err.message);
  }
}