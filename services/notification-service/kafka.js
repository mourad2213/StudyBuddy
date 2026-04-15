const { Kafka } = require("kafkajs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "notification-group" });

const runConsumer = async () => {
  let retries = 10;

  while (retries > 0) {
    try {
      await consumer.connect();
      console.log("✅ Kafka consumer connected");
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

  await consumer.subscribe({
    topic: "study-events",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log("📩 RECEIVED EVENT:", event);

      switch (event.event) {
        case "MATCH_FOUND":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "You have a new compatible study partner!",
              type: "MATCH_FOUND",
            },
          });
          break;

        case "SESSION_CREATED":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "A study session has been created.",
              type: "SESSION_CREATED",
            },
          });
          break;

        case "SESSION_INVITATION_RECEIVED":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "You received a session invitation.",
              type: "SESSION_INVITATION_RECEIVED",
            },
          });
          break;

        case "BUDDY_REQUEST_RECEIVED":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "You received a new buddy request.",
              type: "BUDDY_REQUEST_RECEIVED",
            },
          });
          break;

        case "SESSION_REMINDER":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "Reminder: You have an upcoming study session.",
              type: "SESSION_REMINDER",
            },
          });
          break;

        default:
          console.log(`⚠️ Unknown event type: ${event.event}`);
      }
    },
  });
};

module.exports = { runConsumer };