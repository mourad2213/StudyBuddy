import prisma from "../../prismaClient.js";
import jwt from "jsonwebtoken";
import { sendEvent } from "../../kafka.js";
// get and update  the user
const JWT_SECRET = process.env.JWT_SECRET;
export const userResolvers = {
  Query: {
    getMe: async (_, __, { req }) => {
      const token = req.headers.authorization;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      return prisma.user.findUnique({
        where: { id: decoded.userId },
      });
    },
  },

  Mutation: {
    updateUser: async (_, args, { req }) => {
      const token = req.headers.authorization;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const updatedUser = await prisma.user.update({
        where: { id: decoded.userId },
        data: args,
      });

      try {
        await sendEvent("UserUpdated", updatedUser);
      } catch (err) {
        console.log("Kafka not available, skipping event");
      }

      return updatedUser;
    },
  },
};