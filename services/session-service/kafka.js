const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.SERVICE_NAME || "app",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: `${process.env.SERVICE_NAME}-group`,
});

async function initializeKafka() {
  await producer.connect();
  await consumer.connect();
  console.log(`Kafka initialized for ${process.env.SERVICE_NAME}`);
}

async function publishMessage(topic, messages) {
  try {
    await producer.send({
      topic,
      messages: Array.isArray(messages) ? messages : [messages],
    });
    console.log(`Message published to topic: ${topic}`);
  } catch (error) {
    console.error(`Error publishing to topic ${topic}:`, error);
    throw error;
  }
}

async function subscribeToTopic(topic, onMessage) {
  try {
    await consumer.subscribe({ topic, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const payload = JSON.parse(message.value.toString());
        console.log(`Message received from topic ${topic}:`, payload);
        await onMessage(payload);
      },
    });
    console.log(`Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`Error subscribing to topic ${topic}:`, error);
    throw error;
  }
}

async function disconnectKafka() {
  await producer.disconnect();
  await consumer.disconnect();
  console.log("Kafka disconnected");
}

module.exports = {
  kafka,
  producer,
  consumer,
  initializeKafka,
  publishMessage,
  subscribeToTopic,
  disconnectKafka,
};
