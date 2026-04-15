const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "profile-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
});

const producer = kafka.producer();

async function connectKafka() {
  let retries = 10;
  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected");
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Kafka not ready, retrying in 5s... (${retries} retries left)`);
      await new Promise((res) => setTimeout(res, 5000));
      if (retries === 0) {
        console.error("❌ Could not connect to Kafka after multiple retries");
        return;
      }
    }
  }
}

async function sendEvent(eventName, payload) {
  await producer.send({
    topic: "study-events",
    messages: [
      {
        value: JSON.stringify({
          event: eventName,
          timestamp: new Date().toISOString(),
          service: "profile-service",
          payload
        }),
      },
    ],
  });
  console.log("📤 Event sent to Kafka:", eventName);
}

module.exports = { connectKafka, sendEvent };