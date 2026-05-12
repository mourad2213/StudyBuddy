const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "profile-service",

  // ✅ multi-broker support (Aiven / prod / K8s)
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(",")
    : ["localhost:9092"],

  // ✅ Aiven SSL config
  ssl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          rejectUnauthorized: false,
        }
      : false,

  // ✅ Aiven SASL auth
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

async function connectKafka() {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected");
      return;
    } catch (err) {
      retries--;

      console.log(
        `⏳ Kafka not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);

      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Could not connect to Kafka after multiple retries");
      }
    }
  }
}

async function sendEvent(eventName, payload) {
  try {
    await producer.send({
      topic: "study-events",
      messages: [
        {
          value: JSON.stringify({
            event: eventName,
            timestamp: new Date().toISOString(),
            service: "profile-service",
            payload,
          }),
        },
      ],
    });

    console.log("📤 Event sent to Kafka:", eventName);
  } catch (err) {
    console.error("❌ Error sending Kafka event:", err.message);
  }
}

module.exports = { connectKafka, sendEvent };