import { Kafka } from "kafkajs";

const getBrokerConfig = () => {
  const broker = process.env.KAFKA_BROKER;

  if (!broker) {
    throw new Error("KAFKA_BROKER environment variable is not set");
  }

  const baseConfig = {
    clientId: "messaging-service",
    brokers: [broker],
  };

  // Add SSL/SASL only if credentials are provided (managed cloud Kafka)
  if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
    return {
      ...baseConfig,
      ssl: true,
      sasl: {
        mechanism: "scram-sha-256",
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      },
    };
  }

  return baseConfig;
};

const kafka = new Kafka(getBrokerConfig());

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "messaging-service-group" });

export async function connectProducer() {
  let retries = 10;
  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected");
      break;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Kafka Producer not ready, retrying in 5s... (${retries} retries left)`
      );
      await new Promise((res) => setTimeout(res, 5000));
      if (retries === 0) {
        console.error("❌ Could not connect to Kafka Producer after multiple retries");
        return;
      }
    }
  }
}

export async function connectConsumer() {
  let retries = 10;
  while (retries > 0) {
    try {
      await consumer.connect();
      console.log("✅ Kafka Consumer Connected");
      break;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Kafka Consumer not ready, retrying in 5s... (${retries} retries left)`
      );
      await new Promise((res) => setTimeout(res, 5000));
      if (retries === 0) {
        console.error("❌ Could not connect to Kafka Consumer after multiple retries");
        return;
      }
    }
  }
}

export async function subscribeToEvents(callback) {
  await consumer.subscribe({ topic: "study-events", fromBeginning: false });
  await consumer.subscribe({ topic: "BuddyRequestCreated", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log("📨 Message from Kafka:", event);
        await callback(event);
      } catch (err) {
        console.error("Error processing Kafka message:", err);
      }
    },
  });
}

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
    console.error("Error sending event to Kafka:", err);
  }
}

export async function disconnectProducer() {
  await producer.disconnect();
}

export async function disconnectConsumer() {
  await consumer.disconnect();
}