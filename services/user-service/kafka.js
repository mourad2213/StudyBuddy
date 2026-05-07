import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "user-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
};

export const sendEvent = async (topic, data) => {
  try {
    console.log("Sending event to Kafka:", topic);
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            event: topic,
            timestamp: new Date(),
            payload: data,
          }),
        },
      ],
    });
    console.log("✅ Event sent successfully");
  } catch (err) {
    console.log("Kafka send failed, skipping...");
  }
};
