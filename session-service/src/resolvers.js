const prisma = require("./db");

const sessionInclude = { participants: true };

const resolvers = {
  Query: {
    upcomingSessions: async (_, { userId }) => {
      return prisma.studySession.findMany({
        where: {
          OR: [
            { creatorId: userId },
            { participants: { some: { userId } } },
          ],
          dateTime: {
            gte: new Date(),
          },
        },
        include: sessionInclude,
        orderBy: { dateTime: "asc" },
      });
    },
    pastSessions: async (_, { userId }) => {
      return prisma.studySession.findMany({
        where: {
          OR: [
            { creatorId: userId },
            { participants: { some: { userId } } },
          ],
          dateTime: {
            lt: new Date(),
          },
        },
        include: sessionInclude,
        orderBy: { dateTime: "desc" },
      });
    },
    sessionById: async (_, { id }) => {
      return prisma.studySession.findUnique({
        where: { id },
        include: sessionInclude,
      });
    },
  },

  Mutation: {
    createStudySession: async (_, { input }) => {
      const normalizedLocation = input.location?.trim();

      if (input.sessionType === "OFFLINE" && !normalizedLocation) {
        throw new Error("Location is required for offline sessions.");
      }

      const session = await prisma.studySession.create({
        data: {
          topic: input.topic,
          sessionType: input.sessionType,
          location: input.sessionType === "OFFLINE" ? normalizedLocation : null,
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
        include: sessionInclude,
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
        include: sessionInclude,
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
        include: sessionInclude,
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
