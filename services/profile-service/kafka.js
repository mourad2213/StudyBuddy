const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "profile-service",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "test-group" });

async function connectKafka() {
  await producer.connect();
  console.log("✅ Kafka Producer Connected");

  await consumer.connect();
  console.log("👂 Kafka Consumer Connected");

  // subscribe to ALL your topics (for testing)
  await consumer.subscribe({ topic: "UserPreferencesUpdated", fromBeginning: true });
  await consumer.subscribe({ topic: "CourseUpdated", fromBeginning: true });
  await consumer.subscribe({ topic: "TopicUpdated", fromBeginning: true });
  await consumer.subscribe({ topic: "ProfileUpdated", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      console.log("\n================ KAFKA EVENT RECEIVED ================");
      console.log("📌 Topic:", topic);
      console.log("📦 Message:", JSON.parse(message.value.toString()));
      console.log("=====================================================\n");
    },
  });
}

async function sendEvent(topic, message) {
  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(message),
      },
    ],
  });

  console.log("📤 Event sent to Kafka:", topic);
}

module.exports = { connectKafka, sendEvent };