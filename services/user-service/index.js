// conect the resolvers
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { typeDefs } from "./graphql/schema/user.type.js";
import { authResolvers } from "./graphql/resolvers/auth.resolver.js";
import { userResolvers } from "./graphql/resolvers/user.resolver.js";

const app = express(); // create express app(the server)

const server = new ApolloServer({
  // attach graphql server to express app , this tells apollo "Use these schemas and resolvers"
  typeDefs,
  resolvers: [authResolvers, userResolvers],
  context: ({ req }) => ({ req }),
});

await server.start();
server.applyMiddleware({ app }); //Mount GraphQL endpoint , this creates the localhost:4000/graphql endpoint where we can send our queries and mutations

app.listen(4001, () => {
  console.log("User service running on port 4001");
}); // start the server on port 4001
