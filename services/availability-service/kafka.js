const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "availability-service",

  // Multiple brokers from env
  // Example:
  // KAFKA_BROKERS=host1:9092,host2:9092,host3:9092
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(",")
    : ["localhost:9092"],

  // Aiven SSL setup
  ssl: {
    rejectUnauthorized: false,
  },

  // Aiven SASL auth
  sasl: process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
    ? {
        mechanism: "plain",
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      }
    : undefined,
});

const producer = kafka.producer();
let isProducerConnected = false;

const initKafka = async () => {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      isProducerConnected = true;
      console.log("✅ Kafka Producer Ready");
      return;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Kafka not ready, retrying... (${retries} left)`
      );
      console.error(err.message);

      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  console.error("❌ Could not connect Kafka producer after retries");
};

const publishEvent = async (eventType, data) => {
  if (!isProducerConnected) {
    console.warn(
      "Kafka producer not connected, skipping event:",
      eventType
    );
    return null;
  }

  const message = {
    eventName: eventType,
    timestamp: new Date().toISOString(),
    producerService: "availability-service",
    correlationId: data.userId || "system",
    payload: data,
  };

  try {
    await producer.send({
      topic: "availability-events",
      messages: [{ value: JSON.stringify(message) }],
    });

    console.log("📤 Event published:", eventType);
  } catch (err) {
    console.error("Error publishing event:", err);
    return null;
  }
};

// Also publish to the specific topic names matching service listens to
const publishAvailabilityEvent = async (eventType, data) => {
  if (!isProducerConnected) {
    console.warn(
      "Kafka producer not connected, skipping:",
      eventType
    );
    return null;
  }

  const message = {
    eventName: eventType,
    timestamp: new Date().toISOString(),
    producerService: "availability-service",
    correlationId: data.userId || "system",
    payload: data,
  };

  try {
    // Publish to event-specific topic
    await producer.send({
      topic: eventType,
      messages: [{ value: JSON.stringify(message) }],
    });

    // Publish to shared topic
    await producer.send({
      topic: "availability-events",
      messages: [{ value: JSON.stringify(message) }],
    });

    console.log("📤 Availability event published:", eventType);
  } catch (err) {
    console.error(
      "Error publishing availability event:",
      err
    );
    return null;
  }
};

const closeKafka = async () => {
  try {
    await producer.disconnect();
    console.log("Kafka producer disconnected");
  } catch (err) {
    console.error("Error closing Kafka:", err);
  }
};

module.exports = {
  initKafka,
  publishEvent,
  publishAvailabilityEvent,
  closeKafka,
};