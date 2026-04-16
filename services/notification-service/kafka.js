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

  // Subscribe to multiple topics
  await consumer.subscribe({
    topic: "study-events",
    fromBeginning: false,
  });

  await consumer.subscribe({
    topic: "RecommendationsGenerated",
    fromBeginning: false,
  });

  await consumer.subscribe({
    topic: "BuddyRequestCreated",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log("📩 RECEIVED EVENT:", event);

      // Handle different event structures
      const eventType = event.eventName || event.event;

      switch (eventType) {
        case "SESSION_CREATED":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "A study session has been created.",
              type: "SESSION_CREATED",
            },
          });
          break;

        case "SESSION_UPDATED":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: "A study session has been updated.",
              type: "SESSION_UPDATED",
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

        case "RecommendationsGenerated":
          await prisma.notification.create({
            data: {
              userId: event.payload.userId,
              message: `You have ${event.payload.recommendations.length} new study buddy recommendations!`,
              type: "NEW_RECOMMENDATIONS",
            },
          });
          break;

        case "BuddyRequestCreated":
          await prisma.notification.create({
            data: {
              userId: event.payload.toUserId,
              message: "Someone wants to study with you! Check your buddy requests.",
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
          console.log(`⚠️ Unknown event type: ${eventType}`);
      }
    },
  });
};

module.exports = { runConsumer };