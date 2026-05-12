import { Kafka, logLevel } from "kafkajs";

// ==============================
// VALIDATE BROKERS (IMPORTANT)
// ==============================
const brokers = (process.env.KAFKA_BROKERS || "")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("❌ KAFKA_BROKERS is not set correctly");
}

// ==============================
// KAFKA CLIENT (AIVEN READY)
// ==============================
const kafka = new Kafka({
  clientId: "messaging-service",
  brokers,

  logLevel: logLevel.INFO,

  // ==============================
  // AIVEN SSL CONFIG
  // ==============================
  ssl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? true
      : false,

  // ==============================
  // AIVEN SASL AUTH
  // ==============================
  sasl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          mechanism: "plain",
          username: process.env.KAFKA_USERNAME,
          password: process.env.KAFKA_PASSWORD,
        }
      : undefined,
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
      console.log("✅ Kafka Producer Connected");
      return;
    } catch (err) {
      retries--;

      console.log(
        `⏳ Kafka Producer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);

      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Producer failed to connect to Kafka");
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
      console.log("✅ Kafka Consumer Connected");
      return;
    } catch (err) {
      retries--;

      console.log(
        `⏳ Kafka Consumer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);

      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Consumer failed to connect to Kafka");
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
    await producer.send({
      topic: "study-events",
      messages: [
        {
          value: JSON.stringify({
            event: eventName,
            timestamp: new Date().toISOString(),
            service: "messaging-service",
            payload,
          }),
        },
      ],
    });

    console.log("📤 Event sent to Kafka:", eventName);
  } catch (err) {
    console.error("❌ Kafka send failed:", err.message);
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