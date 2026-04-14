import prisma from "../../prismaClient.js";
import jwt from "jsonwebtoken";
// get and update  the user
const JWT_SECRET = "supersecret";

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

      return prisma.user.update({
        where: { id: decoded.userId },
        data: args,
      });
    },
  },
};
