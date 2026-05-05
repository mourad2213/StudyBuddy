const { Kafka } = require("kafkajs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:29092"],
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
      console.log(
        `⏳ Kafka not ready, retrying in 5s... (${retries} retries left)`,
      );
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
          // Notify both participants that conversation started
          if (event.payload.participant1Id) {
            await prisma.notification.create({
              data: {
                userId: event.payload.participant1Id,
                message: "A new conversation has started with your study buddy!",
                type: "CONVERSATION_STARTED",
              },
            });
          }
          if (event.payload.participant2Id) {
            await prisma.notification.create({
              data: {
                userId: event.payload.participant2Id,
                message: "A new conversation has started with your study buddy!",
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
          // Notify session creator about invitation response
          if (event.payload.creatorId) {
            const statusMessage = {
              ACCEPTED: "accepted",
              REJECTED: "declined",
              PENDING: "pending"
            }[event.payload.status] || event.payload.status.toLowerCase();

            await prisma.notification.create({
              data: {
                userId: event.payload.creatorId,
                message: `User ${event.payload.userId} ${statusMessage} your invitation${event.payload.topic ? ` for \"${event.payload.topic}\"` : ""}.`,
                type: "INVITATION_RESPONSE",
              },
            });
          }
          break;

        case "SessionJoined":
          // Notify session creator when someone joins their session
          if (event.payload.creatorId && event.payload.userId) {
            await prisma.notification.create({
              data: {
                userId: event.payload.creatorId,
                message: `User ${event.payload.userId} requested to join${event.payload.topic ? ` your session \"${event.payload.topic}\"` : " your session"}.`,
                type: "SESSION_JOINED",
              },
            });
          }
          break;

        case "SessionCancelled":
          // Notify all participants (except creator) that the session was cancelled
          if (Array.isArray(event.payload.participantIds) && event.payload.participantIds.length > 0) {
            await Promise.all(
              event.payload.participantIds.map((participantId) =>
                prisma.notification.create({
                  data: {
                    userId: participantId,
                    message: `A session${event.payload.topic ? ` (\"${event.payload.topic}\")` : ""} was cancelled by the creator.`,
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
    },
  });
};

module.exports = { runConsumer };
