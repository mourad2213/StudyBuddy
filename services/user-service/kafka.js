import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "user-service",
  brokers: ["localhost:9092"], // change later if needed
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
};

export const sendEvent = async (topic, data) => {
  try {
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
  } catch (err) {
    console.log("Kafka send failed, skipping...");
  }
};
