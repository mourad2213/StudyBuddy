require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");

const {
  initializeKafka,
  publishMessageEvent,
  disconnectKafka,
} = require("./kafka");

const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4004);

async function startServer() {
  const app = express();

  // Initialize Kafka
  try {
    await initializeKafka();
  } catch (error) {
    console.warn("Kafka initialization failed. Service will continue without Kafka:", error.message);
  }

  app.use(cors());
  app.use(express.json());

  app.get("/", (_, res) => {
    res.status(200).json({
      status: "ok",
      service: "messaging-service",
      message: "Messaging service is running",
    });
  });

  // Health check endpoint
  app.get("/health", (_, res) => {
    res.status(200).json({
      status: "ok",
      service: "messaging-service",
      timestamp: new Date().toISOString(),
    });
  });

  // Get all chats for a specific user
  app.get("/api/chats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const chats = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId,
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          participants: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      res.json({ success: true, data: chats });
    } catch (error) {
      console.error("Error fetching chats for user:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // Get messages between two users
  app.get("/api/messages/:conversationId", async (req, res) => {
    try {
      const { conversationId } = req.params;

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send a message
  app.post("/api/messages", async (req, res) => {
    try {
      const { conversationId, senderId, receiverId, content } = req.body;

      if (!conversationId || !senderId || !receiverId || !content) {
        return res.status(400).json({
          error: "conversationId, senderId, receiverId, and content are required",
        });
      }

      if (senderId === receiverId) {
        return res.status(400).json({
          error: "senderId and receiverId must be different",
        });
      }

      // Ensure conversation exists before creating the message to avoid FK violations.
      await prisma.conversation.upsert({
        where: { id: conversationId },
        update: {},
        create: { id: conversationId },
      });

      // Ensure both users are participants in this conversation.
      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId: senderId,
          },
        },
        update: {},
        create: {
          conversationId,
          userId: senderId,
        },
      });

      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId: receiverId,
          },
        },
        update: {},
        create: {
          conversationId,
          userId: receiverId,
        },
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content,
        },
      });

      try {
        await publishMessageEvent(
          conversationId,
          message.id,
          "message_sent",
          message
        );
      } catch (publishError) {
        console.warn("Kafka publish failed, message saved anyway:", publishError.message);
      }

      res.json({ success: true, data: message });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`Messaging service running on http://localhost:${port}`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await disconnectKafka();
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error("Failed to start messaging service", error);
  process.exit(1);
});