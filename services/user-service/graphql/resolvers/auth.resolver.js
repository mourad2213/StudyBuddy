import prisma from "../../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
//register and  login 

const JWT_SECRET = "supersecret"; // move to .env later

export const authResolvers = {
  Mutation: {
    register: async (_, { name, email, password }) => {
      // hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // save user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      // create token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET);

      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error("Invalid password");
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);

      return { token, user };
    },
  },
};
