import prisma from "../../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEvent } from "../../kafka.js";

//register and  login
const JWT_SECRET = process.env.JWT_SECRET;

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
      // send event to kafka
      try {
        await sendEvent("UserRegistered", user);
      } catch (err) {
        console.log("Kafka not available, skipping event");
      } // send event to kafka
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
