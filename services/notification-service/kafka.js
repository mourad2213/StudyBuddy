const { Kafka } = require("kafkajs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ============================================
// VALIDATE REQUIRED AIVEN CONFIGURATION
// ============================================
const validateKafkaConfig = () => {
  const brokers = process.env.KAFKA_BROKERS?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS environment variable is required (comma-separated: host1:9092,host2:9092)"
    );
  }

  if (!username || !password) {
    throw new Error(
      "KAFKA_USERNAME and KAFKA_PASSWORD environment variables are required for Aiven"
    );
  }

  return { brokers, username, password };
};

const { brokers: brokerString, username, password } = validateKafkaConfig();
const brokers = brokerString
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No valid brokers found after parsing KAFKA_BROKERS");
}

// ============================================
// KAFKA CLIENT - AIVEN ONLY
// ============================================
const kafka = new Kafka({
  clientId: "notification-service",
  brokers,

  // ✅ ALWAYS use SSL for Aiven
  ssl: {
    ca: [process.env.KAFKA_CA_CERT?.replace(/\\n/g, '\n')],
    rejectUnauthorized: true,
  },

  // ✅ ALWAYS use SASL plain for Aiven
  sasl: {
    mechanism: "plain",
    username,
    password,
  },

  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

const consumer = kafka.consumer({
  groupId: "notification-group",
});

// ============================================
// CONSUMER CONNECTION
// ============================================
const connectConsumer = async () => {
  let retries = 10;

  while (retries > 0) {
    try {
      await consumer.connect();
      console.log("✅ Kafka consumer connected (notification-service)");
      return;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Consumer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Consumer failed to connect to Kafka after retries");
        throw new Error("Failed to connect Kafka consumer");
      }
    }
  }
};

const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    console.log("✅ Kafka consumer disconnected");
  } catch (err) {
    console.error("Error disconnecting consumer:", err.message);
  }
};

// ============================================
// RUN CONSUMER
// ============================================
const runConsumer = async () => {
  await connectConsumer();

  // ======================
  // SUBSCRIPTIONS
  // ======================
  await consumer.subscribe({
    topic: "study-events",
    fromBeginning: false,
  });

  await consumer.subscribe({
    topic: "session-events",
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

  // ======================
  // CONSUMER LOOP
  // ======================
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let event;

      try {
        event = JSON.parse(message.value.toString());
        console.log("📩 RECEIVED EVENT:", event);
      } catch (err) {
        console.error("Invalid JSON message:", err);
        return;
      }

      const eventType = event.eventName || event.event;

      try {
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
                message:
                  "Someone wants to study with you! Check your buddy requests.",
                type: "BUDDY_REQUEST_RECEIVED",
              },
            });
            break;

          case "MessageSent": {
            const recipient =
              event.payload.recipientId ||
              event.payload.otherParticipant;

            if (recipient) {
              await prisma.notification.create({
                data: {
                  userId: recipient,
                  message: `New message from ${
                    event.payload.senderName || "a study buddy"
                  }: ${event.payload.content?.substring(0, 50) || "New message"}${
                    event.payload.content?.length > 50 ? "..." : ""
                  }`,
                  type: "MESSAGE_SENT",
                },
              });
            }
            break;
          }

          case "ConversationCreated":
            if (event.payload.participant1Id) {
              await prisma.notification.create({
                data: {
                  userId: event.payload.participant1Id,
                  message:
                    "A new conversation has started with your study buddy!",
                  type: "CONVERSATION_STARTED",
                },
              });
            }

            if (event.payload.participant2Id) {
              await prisma.notification.create({
                data: {
                  userId: event.payload.participant2Id,
                  message:
                    "A new conversation has started with your study buddy!",
                  type: "CONVERSATION_STARTED",
                },
              });
            }
            break;

          case "StudySessionCreated":
            if (
              Array.isArray(event.payload.possibleMemberIds)
            ) {
              await Promise.all(
                event.payload.possibleMemberIds
                  .filter((id) => id !== event.payload.creatorId)
                  .map((memberId) =>
                    prisma.notification.create({
                      data: {
                        userId: memberId,
                        message: `You've been invited to join a study session: "${event.payload.topic}"`,
                        type: "SESSION_INVITATION_RECEIVED",
                      },
                    })
                  )
              );
            }
            break;

          case "InvitationResponded":
            if (event.payload.creatorId) {
              await prisma.notification.create({
                data: {
                  userId: event.payload.creatorId,
                  message: `User ${event.payload.userId} responded to your invitation.`,
                  type: "INVITATION_RESPONSE",
                },
              });
            }
            break;

          case "SessionJoined":
            if (event.payload.creatorId) {
              await prisma.notification.create({
                data: {
                  userId: event.payload.creatorId,
                  message: `User ${event.payload.userId} requested to join your session.`,
                  type: "SESSION_JOINED",
                },
              });
            }
            break;

          case "SessionCancelled":
            if (Array.isArray(event.payload.participantIds)) {
              await Promise.all(
                event.payload.participantIds.map((id) =>
                  prisma.notification.create({
                    data: {
                      userId: id,
                      message: `A session was cancelled.`,
                      type: "SESSION_CANCELLED",
                    },
                  })
                )
              );
            }
            break;

          default:
            console.log(`⚠️ Unknown event type: ${eventType}`);
        }
      } catch (err) {
        console.error("❌ Error handling event:", err);
      }
    },
  });
};

module.exports = { kafka, consumer, connectConsumer, disconnectConsumer, runConsumer };