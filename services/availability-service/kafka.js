const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "availability-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
});

const producer = kafka.producer();
let isProducerConnected = false;

const initKafka = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await producer.connect();
      isProducerConnected = true;
      console.log("Kafka Producer Ready");
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ Kafka not ready, retrying... (${retries} left)`);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
  console.error("❌ Could not connect Kafka producer after retries");
};

const publishEvent = async (eventType, data) => {
  if (!isProducerConnected) {
    console.warn("Kafka producer not connected, skipping event:", eventType);
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
    console.log("Event published:", eventType);
  } catch (err) {
    console.error("Error publishing event:", err);
    return null;
  }
};

// Also publish to the specific topic names matching service listens to
const publishAvailabilityEvent = async (eventType, data) => {
  if (!isProducerConnected) {
    console.warn("Kafka producer not connected, skipping:", eventType);
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
    // Publish to both the generic topic AND the specific named topic
    // so matching-service (which listens to AvailabilityCreated etc.) receives it
    await producer.send({
      topic: eventType, // e.g. "AvailabilityCreated"
      messages: [{ value: JSON.stringify(message) }],
    });
    await producer.send({
      topic: "availability-events",
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log("Availability event published:", eventType);
  } catch (err) {
    console.error("Error publishing availability event:", err);
    return null;
  }
};

const closeKafka = async () => {
  try {
    await producer.disconnect();
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