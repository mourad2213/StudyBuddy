const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { PrismaClient } = require("@prisma/client");
const { runConsumer } = require("./kafka");

const prisma = new PrismaClient();

const app = express();

// GraphQL Schema
const typeDefs = gql`
  type Notification {
    id: ID!
    userId: String!
    message: String!
    type: String!
    isRead: Boolean!
    createdAt: String!
  }

  type Query {
    getNotifications(userId: String!): [Notification]
    getUnreadNotifications(userId: String!): [Notification]
    getUnreadCount(userId: String!): Int!
  }

  type Mutation {
    markAsRead(notificationId: ID!): Notification
    markAllAsRead(userId: String!): Boolean
    deleteNotification(notificationId: ID!): Boolean  

  }
`;

// Resolvers
const resolvers = {
  Query: {
    getNotifications: async (_, { userId }) => {
      return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    },

    getUnreadNotifications: async (_, { userId }) => {
      return prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: "desc" },
      });
    },

    getUnreadCount: async (_, { userId }) => {
      return prisma.notification.count({
        where: { userId, isRead: false },
      });
    },
  },

  Mutation: {
    markAsRead: async (_, { notificationId }) => {
      return prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    },

    markAllAsRead: async (_, { userId }) => {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return true;
    },

    deleteNotification: async (_, { notificationId }) => {
    await prisma.notification.delete({ where: { id: notificationId } });
    return true;
    },
  },
};

async function startServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  // start kafka
runConsumer();

  const PORT = process.env.PORT || 4005;

  app.listen(PORT, () => {
      console.log(`🚀 GraphQL running at http://localhost:${PORT}/graphql`);
  });
  }

startServer();