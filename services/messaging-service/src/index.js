import "dotenv/config";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import http from "http";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageLocalDefault,
} from "apollo-server-core";
import { typeDefs } from "../graphql/schema/message.type.js";
import { messageResolvers } from "../graphql/resolvers/message.resolver.js";
import {
  connectProducer,
  connectConsumer,
  subscribeToEvents,
} from "../kafka.js";
import { registerMatchedPair } from "../graphql/resolvers/message.resolver.js";
import { setupWebSocket, sendToUser, getRegistryStatus, getDBRegistryStatus } from "./websocket.js";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4008;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "messaging-service" });
});

// Debug endpoint - WebSocket registry status
app.get("/debug/websocket-status", (req, res) => {
  res.json(getRegistryStatus());
});

// Debug endpoint - Database registry status
app.get("/debug/db-sessions", async (req, res) => {
  const status = await getDBRegistryStatus();
  res.json(status);
});

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers: messageResolvers,
  introspection: true, // Enable introspection for testing
  plugins:
    process.env.NODE_ENV === "production"
      ? [ApolloServerPluginLandingPageDisabled()]
      : [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
  context: async ({ req, connection }) => {
    // Handle WebSocket subscriptions
    if (connection) {
      return connection.context;
    }
    // Handle HTTP requests
    const userId = req?.headers["x-user-id"];
    return { userId };
  },
});

// Start server
async function startServer() {
  try {
    // Create HTTP server for WebSocket support
    const httpServer = http.createServer(app);

    // Setup WebSocket
    setupWebSocket(httpServer);
    console.log("✅ WebSocket server initialized");

    // Start Apollo Server
    await server.start();
    server.applyMiddleware({ app });
    console.log(`📊 GraphQL endpoint at http://localhost:${PORT}/graphql`);

    // Connect to Kafka
    try {
      await connectProducer();
      await connectConsumer();

      // Subscribe to relevant events from other services
      await subscribeToEvents(async (event) => {
        handleKafkaEvent(event);
      });

      console.log("✅ Kafka connected");
    } catch (err) {
      console.log(
        "⚠️  Kafka not available, continuing with local mode only"
      );
    }

    // Listen on HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Messaging Service running on port ${PORT}`);
      console.log(`📡 WebSocket available at ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

// Handle Kafka events from other services
async function handleKafkaEvent(event) {
  const eventName = event.event || event.eventName;
  const payload = event.payload || {};

  switch (eventName) {
    case "StudySessionCreated":
      // Notify relevant participants
      if (payload.creatorId) {
        sendToUser(payload.creatorId, {
          type: "session_created",
          sessionId: payload.sessionId,
          message: "Your study session has been created",
        });
      }
      break;

    case "MatchFound":
      // Notify matched users to start messaging
      if (payload.user1Id && payload.user2Id) {
        registerMatchedPair(payload.user1Id, payload.user2Id);
        sendToUser(payload.user1Id, {
          type: "match_found",
          matchedUserId: payload.user2Id,
          message: "You have a new study buddy match!",
        });
        sendToUser(payload.user2Id, {
          type: "match_found",
          matchedUserId: payload.user1Id,
          message: "You have a new study buddy match!",
        });
      }
      break;

    case "BuddyRequestCreated":
      if (payload.type === "MATCH_ACCEPTED") {
        registerMatchedPair(payload.fromUserId, payload.toUserId);
      }
      break;

    case "SessionJoined":
      // Notify session participants
      if (payload.sessionId && payload.userId) {
        sendToUser(payload.userId, {
          type: "session_joined",
          sessionId: payload.sessionId,
          message: `User ${payload.userName} joined your session`,
        });
      }
      break;

    default:
      console.log("Unknown event:", eventName);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
