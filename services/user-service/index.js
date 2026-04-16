// conect the resolvers
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { typeDefs } from "./graphql/schema/user.type.js";
import { authResolvers } from "./graphql/resolvers/auth.resolver.js";
import { userResolvers } from "./graphql/resolvers/user.resolver.js";
import { connectProducer } from "./kafka.js";

const app = express(); // create express app(the server)

const server = new ApolloServer({
  // attach graphql server to express app , this tells apollo "Use these schemas and resolvers"
  typeDefs,
  resolvers: [authResolvers, userResolvers],
  context: ({ req }) => ({ req }),
});

await server.start();
server.applyMiddleware({ app }); //Mount GraphQL endpoint , this creates the localhost:4000/graphql endpoint where we can send our queries and mutations

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
}); // start the server on port 5000

try {
  await connectProducer();
  console.log("Kafka connected");
} catch (err) {
  console.log("Kafka not available, continuing without it");
} // connect to kafka producer
