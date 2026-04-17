
const prisma = require("./db");
const { publishEvent } = require("./kafka");

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

    getSessionAcceptedMembers: async (_, { sessionId }) => {
      const acceptedParticipants = await prisma.sessionParticipant.findMany({
        where: {
          sessionId,
          inviteStatus: "ACCEPTED",
        },
        select: {
          userId: true,
          role: true,
          joinedAt: true,
        },
      });

      return acceptedParticipants;
    },

    getPendingInvitations: async (_, { userId }) => {
      return prisma.studySession.findMany({
        where: {
          participants: {
            some: {
              userId,
              inviteStatus: "PENDING",
            },
          },
        },
        include: sessionInclude,
        orderBy: { dateTime: "asc" },
      });
    },
  },

  Mutation: {
    createStudySession: async (_, { input }) => {
      const normalizedLocation = input.location?.trim();

      if (input.sessionType === "OFFLINE" && !normalizedLocation) {
        throw new Error("Location is required for offline sessions.");
      }

      // Validate possibleMemberIds
      if (!input.possibleMemberIds || input.possibleMemberIds.length === 0) {
        throw new Error("At least one possible member must be specified.");
      }

      // Create the session with creator as HOST
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
              inviteStatus: "ACCEPTED",
            },
          },
        },
        include: sessionInclude,
      });

      // Add possible members with PENDING status
      const participantPromises = input.possibleMemberIds
        .filter((memberId) => memberId !== input.creatorId) // Don't add creator again
        .map((memberId) =>
          prisma.sessionParticipant.create({
            data: {
              userId: memberId,
              sessionId: session.id,
              role: "MEMBER",
              inviteStatus: "PENDING",
            },
          })
        );

      await Promise.all(participantPromises);

      // Publish event to Kafka - TODO: Other services will listen and handle this
      try {
        await publishEvent("session-events", "StudySessionCreated", {
          sessionId: session.id,
          topic: input.topic,
          creatorId: input.creatorId,
          sessionType: input.sessionType,
          dateTime: input.dateTime,
          possibleMemberIds: input.possibleMemberIds,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to publish StudySessionCreated event:", error);
        // Don't fail the session creation if event publishing fails
      }

      // Fetch and return the updated session with all participants
      const updatedSession = await prisma.studySession.findUnique({
        where: { id: session.id },
        include: sessionInclude,
      });

      return updatedSession;
    },

    respondToSessionInvitation: async (_, { sessionId, userId, status }) => {
      // Validate status
      const validStatuses = ["ACCEPTED", "REJECTED", "PENDING"];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      // Find the participant record
      const participant = await prisma.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
      });

      if (!participant) {
        throw new Error(
          "Participant not found for this session or user not invited."
        );
      }

      // Update the participant status
      const updatedParticipant = await prisma.sessionParticipant.update({
        where: { id: participant.id },
        data: { inviteStatus: status },
      });

      // Publish event to Kafka - TODO: Other services will listen and handle this
      try {
        await publishEvent("session-events", "InvitationResponded", {
          sessionId,
          userId,
          status,
          participantId: updatedParticipant.id,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to publish InvitationResponded event:", error);
        // Don't fail the response if event publishing fails
      }

      return updatedParticipant;
    },

    joinSession: async (_, { sessionId, userId }) => {
      // Check if user is already a participant
      const existingParticipant = await prisma.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
      });

      if (existingParticipant) {
        throw new Error("User is already a participant in this session.");
      }

      await prisma.sessionParticipant.create({
        data: {
          sessionId,
          userId,
          role: "MEMBER",
          inviteStatus: "ACCEPTED",
        },
      });

      // Publish event to Kafka - TODO: Other services will listen and handle this
      try {
        await publishEvent("session-events", "SessionJoined", {
          sessionId,
          userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to publish SessionJoined event:", error);
      }

      return prisma.studySession.findUnique({
        where: { id: sessionId },
        include: sessionInclude,
      });
    },

    leaveSession: async (_, { sessionId, userId }) => {
      const participant = await prisma.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
      });

      if (!participant) {
        throw new Error("User is not a participant in this session.");
      }

      // Check if user is the host
      if (participant.role === "HOST") {
        throw new Error("Host cannot leave the session. Cancel the session instead.");
      }

      await prisma.sessionParticipant.delete({
        where: { id: participant.id },
      });

      // Publish event to Kafka - TODO: Other services will listen and handle this
      try {
        await publishEvent("session-events", "SessionLeft", {
          sessionId,
          userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to publish SessionLeft event:", error);
      }

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

      // Publish event to Kafka - TODO: Other services will listen and handle this
      try {
        await publishEvent("session-events", "SessionCancelled", {
          sessionId: id,
          creatorId: requesterId,
          topic: session.topic,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to publish SessionCancelled event:", error);
      }

      return true;
    },
  },
};

module.exports = resolvers;
