import { PrismaClient } from "@prisma/client";
import { sendEvent } from "../../kafka.js";
import { sendToUser } from "../../src/websocket.js";

const prisma = new PrismaClient();
const matchedPairs = new Set();
const matchingDatabaseUrl = process.env.MATCHING_DATABASE_URL;
const matchingPrisma = matchingDatabaseUrl
  ? new PrismaClient({
      datasources: {
        db: {
          url: matchingDatabaseUrl,
        },
      },
    })
  : null;

function normalizePair(userId1, userId2) {
  return [userId1, userId2].sort().join("::");
}

export function registerMatchedPair(userId1, userId2) {
  if (!userId1 || !userId2) {
    return;
  }

  matchedPairs.add(normalizePair(userId1, userId2));
}

function createUserFacingError(message) {
  const error = new Error(message);
  error.isUserFacing = true;
  return error;
}

async function isPairMatchedInMatchingDb(userId, otherUserId) {
  if (!matchingPrisma) {
    return false;
  }

  try {
    const rows = await matchingPrisma.$queryRaw`
      SELECT 1
      FROM match_recommendation
      WHERE (user_id = ${userId} AND candidate_id = ${otherUserId})
         OR (user_id = ${otherUserId} AND candidate_id = ${userId})
      LIMIT 1
    `;

    return rows.length > 0;
  } catch (err) {
    console.error("Error checking matched users in matching DB:", err);
    return false;
  }
}

async function ensureUsersAreMatched(userId, otherUserId) {
  if (userId === otherUserId) {
    throw createUserFacingError("You cannot create a conversation with yourself");
  }

  const pairKey = normalizePair(userId, otherUserId);
  if (matchedPairs.has(pairKey)) {
    return;
  }

  const existsInMatchingDb = await isPairMatchedInMatchingDb(userId, otherUserId);
  if (existsInMatchingDb) {
    registerMatchedPair(userId, otherUserId);
    return;
  }

  throw createUserFacingError(
    "Users must be matched before creating a conversation"
  );
}

export const messageResolvers = {
  Query: {
    async getConversations(_, { userId }) {
      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            OR: [{ participant1Id: userId }, { participant2Id: userId }],
          },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        return conversations.map((conv) => ({
          ...conv,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
          unreadCount: 0, // Will be calculated properly below
          lastMessage: conv.messages[0],
        }));
      } catch (err) {
        console.error("Error fetching conversations:", err);
        throw new Error("Failed to fetch conversations");
      }
    },

    async getConversationMessages(_, { conversationId }) {
      try {
        const messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
        });

        return messages.map((msg) => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
          readAt: msg.readAt ? msg.readAt.toISOString() : null,
        }));
      } catch (err) {
        console.error("Error fetching messages:", err);
        throw new Error("Failed to fetch messages");
      }
    },

    async getDirectConversation(_, { userId, otherUserId }) {
      try {
        let conversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              {
                participant1Id: userId,
                participant2Id: otherUserId,
              },
              {
                participant1Id: otherUserId,
                participant2Id: userId,
              },
            ],
          },
          include: {
            messages: { orderBy: { createdAt: "asc" } },
          },
        });

        if (!conversation) {
          await ensureUsersAreMatched(userId, otherUserId);

          conversation = await prisma.conversation.create({
            data: {
              participant1Id: userId,
              participant2Id: otherUserId,
            },
            include: {
              messages: { orderBy: { createdAt: "asc" } },
            },
          });

          await sendEvent("ConversationCreated", {
            conversationId: conversation.id,
            participant1Id: userId,
            participant2Id: otherUserId,
          });
        }

        return {
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
          unreadCount: 0,
          lastMessage: conversation.messages[conversation.messages.length - 1],
          messages: conversation.messages.map((msg) => ({
            ...msg,
            createdAt: msg.createdAt.toISOString(),
            readAt: msg.readAt ? msg.readAt.toISOString() : null,
          })),
        };
      } catch (err) {
        console.error("Error fetching direct conversation:", err);
        if (err.isUserFacing) {
          throw err;
        }
        throw new Error("Failed to fetch conversation");
      }
    },

    async getUnreadMessagesCount(_, { userId }) {
      try {
        const count = await prisma.message.count({
          where: {
            conversation: {
              OR: [{ participant1Id: userId }, { participant2Id: userId }],
            },
            isRead: false,
            senderId: { not: userId },
          },
        });

        return count;
      } catch (err) {
        console.error("Error fetching unread count:", err);
        throw new Error("Failed to fetch unread count");
      }
    },
  },

  Mutation: {
    async sendMessage(
      _,
      { conversationId, senderId, senderName, content }
    ) {
      try {
        // Verify conversation exists
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        const isParticipant =
          conversation.participant1Id === senderId ||
          conversation.participant2Id === senderId;

        if (!isParticipant) {
          throw createUserFacingError(
            "Sender is not a participant in this conversation"
          );
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId,
            senderName,
            content,
          },
        });

        // Update conversation's updatedAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Determine recipient
        const recipient =
          conversation.participant1Id === senderId
            ? conversation.participant2Id
            : conversation.participant1Id;

        // Publish event to Kafka for notifications
        await sendEvent("MessageSent", {
          messageId: message.id,
          conversationId,
          senderId,
          senderName,
          content,
          recipientId: recipient,
        });

        // Notify recipient via WebSocket
        sendToUser(recipient, {
          type: "new_message",
          messageId: message.id,
          conversationId,
          senderId,
          senderName,
          content,
          timestamp: message.createdAt.toISOString(),
        });

        return {
          ...message,
          createdAt: message.createdAt.toISOString(),
          readAt: message.readAt ? message.readAt.toISOString() : null,
        };
      } catch (err) {
        console.error("Error sending message:", err);
        if (err.isUserFacing) {
          throw err;
        }
        throw new Error("Failed to send message");
      }
    },

    async createConversation(_, { participant1Id, participant2Id }) {
      try {
        // Check if conversation already exists
        let conversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              {
                participant1Id,
                participant2Id,
              },
              {
                participant1Id: participant2Id,
                participant2Id: participant1Id,
              },
            ],
          },
        });

        if (conversation) {
          return {
            ...conversation,
            createdAt: conversation.createdAt.toISOString(),
            updatedAt: conversation.updatedAt.toISOString(),
            unreadCount: 0,
            lastMessage: null,
          };
        }

        await ensureUsersAreMatched(participant1Id, participant2Id);

        // Create new conversation
        conversation = await prisma.conversation.create({
          data: {
            participant1Id,
            participant2Id,
          },
          include: {
            messages: true,
          },
        });

        await sendEvent("ConversationCreated", {
          conversationId: conversation.id,
          participant1Id,
          participant2Id,
        });

        return {
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
          unreadCount: 0,
          lastMessage: null,
        };
      } catch (err) {
        console.error("Error creating conversation:", err);
        if (err.isUserFacing) {
          throw err;
        }
        throw new Error("Failed to create conversation");
      }
    },

    async markMessagesAsRead(_, { conversationId, userId }) {
      try {
        const messages = await prisma.message.updateMany({
          where: {
            conversationId,
            isRead: false,
            senderId: { not: userId },
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        // Fetch and return updated messages
        const updatedMessages = await prisma.message.findMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: true,
          },
        });

        await sendEvent("MessagesRead", {
          conversationId,
          userId,
          count: updatedMessages.length,
        });

        return updatedMessages.map((msg) => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
          readAt: msg.readAt ? msg.readAt.toISOString() : null,
        }));
      } catch (err) {
        console.error("Error marking messages as read:", err);
        throw new Error("Failed to mark messages as read");
      }
    },

    async deleteMessage(_, { messageId }) {
      try {
        await prisma.message.delete({
          where: { id: messageId },
        });

        await sendEvent("MessageDeleted", { messageId });
        return true;
      } catch (err) {
        console.error("Error deleting message:", err);
        throw new Error("Failed to delete message");
      }
    },
  },

  Conversation: {
    async messages(parent) {
      const messages = await prisma.message.findMany({
        where: { conversationId: parent.id },
        orderBy: { createdAt: "asc" },
      });

      return messages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        readAt: msg.readAt ? msg.readAt.toISOString() : null,
      }));
    },

    async unreadCount(parent, _, { userId }) {
      if (!userId) return 0;

      const count = await prisma.message.count({
        where: {
          conversationId: parent.id,
          isRead: false,
          senderId: { not: userId },
        },
      });

      return count;
    },

    async lastMessage(parent) {
      const message = await prisma.message.findFirst({
        where: { conversationId: parent.id },
        orderBy: { createdAt: "desc" },
      });

      if (!message) return null;

      return {
        ...message,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt ? message.readAt.toISOString() : null,
      };
    },
  },
};
