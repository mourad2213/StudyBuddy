const { Kafka } = require("kafkajs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ============================================
// VALIDATE & CONFIGURE KAFKA
// ============================================
const validateKafkaConfig = () => {
  // Support both KAFKA_BROKERS and KAFKA_BROKER for backwards compatibility
  const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER)?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS (or KAFKA_BROKER) environment variable is required (comma-separated: host1:9092,host2:9092)"
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

// Build Kafka config - support both Aiven (with SASL/SSL) and local Confluent Kafka
const kafkaConfig = {
  clientId: "notification-service",
  brokers,
  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
};

// Only add SASL/SSL if credentials are provided (Aiven Kafka)
if (username && password) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: "plain",
    username,
    password,
  };
}

// ============================================
// KAFKA CLIENT (LOCAL OR AIVEN)
// ============================================
const kafka = new Kafka(kafkaConfig);

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

  await consumer.subscribe({
    topic: "BuddyRequestResponded",
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
          console.debug("kafka: SESSION_INVITATION_RECEIVED payload", event.payload);
          try {
            const created = await prisma.notification.create({
              data: {
                userId: event.payload.userId,
                message: event.payload.sessionId 
                  ? `[SESSION_ID:${event.payload.sessionId}] You received a session invitation.`
                  : "You received a session invitation.",
                type: "SESSION_INVITATION_RECEIVED",
              },
            });
            console.debug("kafka: created notification", { id: created.id, userId: created.userId, type: created.type });
          } catch (err) {
            console.error("kafka: failed creating SESSION_INVITATION_RECEIVED notification", { err, payload: event.payload });
          }
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

        // case "SESSION_REMINDER":
        //   await prisma.notification.create({
        //     data: {
        //       userId: event.payload.userId,
        //       message: "Reminder: You have an upcoming study session.",
        //       type: "SESSION_REMINDER",
        //     },
        //   });
        //   break;

        case "MessageSent":
          // Notify recipient of new message
          const recipient = event.payload.conversationId ? 
            (event.payload.recipientId || event.payload.otherParticipant) : 
            null;
          
          if (recipient) {
            await prisma.notification.create({
              data: {
                userId: recipient,
                message: `New message from ${event.payload.senderName || "a study buddy"}: ${event.payload.content?.substring(0, 50) || "New message"}${event.payload.content?.length > 50 ? "..." : ""}`,
                type: "MESSAGE_SENT",
              },
            });
          }
          break;

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
          // Notify all invited members about the session invitation
          if (event.payload.possibleMemberIds && Array.isArray(event.payload.possibleMemberIds)) {
            const invitationPromises = event.payload.possibleMemberIds
              .filter((memberId) => memberId !== event.payload.creatorId) // Don't notify the creator
              .map((memberId) =>
                prisma.notification.create({
                  data: {
                    userId: memberId,
                    message: `You've been invited to join a study session: "${event.payload.topic}"`,
                    type: "SESSION_INVITATION_RECEIVED",
                  },
                })
              );
            
            try {
              await Promise.all(invitationPromises);
              console.log(`✅ Created ${invitationPromises.length} session invitation notifications`);
            } catch (err) {
              console.error("Error creating session invitation notifications:", err);
            }
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
