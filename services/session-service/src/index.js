require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");

const typeDefs = require("./schema");
const resolvers = require("./resolvers");
const { connectProducer, disconnectProducer } = require("./kafka");
const { testConnection } = require("./db");

const port = Number(process.env.PORT || 4007);
const serviceName = process.env.SERVICE_NAME || "session-service";

async function startServer() {
  const app = express();

  // Test database connection first
  console.log("🔗 Testing database connection...");
  try {
    await testConnection();
  } catch (error) {
    console.error("❌ Failed to connect to database. Exiting...");
    process.exit(1);
  }

  // Initialize Kafka producer on startup (non-blocking)
  console.log("📡 Initializing Kafka producer (non-blocking)...");
  connectProducer().catch(() => {
    // Error already logged in kafka.js - just continue
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use("/graphql", cors(), express.json(), expressMiddleware(server));

  app.get("/health", (_, res) => {
    res.status(200).json({
      status: "ok",
      service: serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  const httpServer = app.listen(port, () => {
    console.log(`✅ ${serviceName} running on http://localhost:${port}/graphql`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n📍 Received ${signal}, shutting down gracefully...`);

    httpServer.close(async () => {
      console.log("✅ HTTP server closed");

      try {
        await server.stop();
        console.log("✅ Apollo server stopped");
      } catch (error) {
        console.error("❌ Error stopping Apollo server:", error);
      }

      try {
        await disconnectProducer();
        console.log("✅ Kafka producer disconnected");
      } catch (error) {
        console.error("❌ Error disconnecting Kafka producer:", error);
      }

      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown due to timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start session service", error);
  process.exit(1);
});
