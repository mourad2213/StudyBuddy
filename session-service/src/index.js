require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");

const typeDefs = require("./schema");
const resolvers = require("./resolvers");

const port = Number(process.env.PORT || 4004);

async function startServer() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use("/graphql", cors(), express.json(), expressMiddleware(server));

  app.get("/health", (_, res) => {
    res.status(200).json({
      status: "ok",
      service: process.env.SERVICE_NAME || "session-service",
    });
  });

  app.listen(port, () => {
    console.log(`Session service running on http://localhost:${port}/graphql`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start session service", error);
  process.exit(1);
});
