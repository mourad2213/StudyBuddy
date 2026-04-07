const prisma = require("./db");

const resolvers = {
  Query: {
    sessions: async () => {
      return prisma.studySession.findMany({
        include: { participants: true },
        orderBy: { dateTime: "asc" },
      });
    },
    sessionById: async (_, { id }) => {
      return prisma.studySession.findUnique({
        where: { id },
        include: { participants: true },
      });
    },
  },

  Mutation: {
    createStudySession: async (_, { input }) => {
      const session = await prisma.studySession.create({
        data: {
          topic: input.topic,
          sessionType: input.sessionType,
          dateTime: new Date(input.dateTime),
          durationMins: input.durationMins,
          creatorId: input.creatorId,
          contactInfo: input.contactInfo,
          participants: {
            create: {
              userId: input.creatorId,
              role: "HOST",
            },
          },
        },
        include: { participants: true },
      });

      return session;
    },

    joinSession: async (_, { sessionId, userId }) => {
      await prisma.sessionParticipant.create({
        data: {
          sessionId,
          userId,
          role: "MEMBER",
        },
      });

      return prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
    },

    leaveSession: async (_, { sessionId, userId }) => {
      await prisma.sessionParticipant.deleteMany({
        where: {
          sessionId,
          userId,
        },
      });

      return prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
    },

    cancelSession: async (_, { id, requesterId }) => {
      const session = await prisma.studySession.findUnique({ where: { id } });

      if (!session) {
        return false;
      }

      if (session.creatorId !== requesterId) {
        throw new Error("Only the creator can cancel this session.");
      }

      await prisma.studySession.delete({ where: { id } });
      return true;
    },
  },
};

module.exports = resolvers;
