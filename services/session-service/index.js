require("dotenv").config();

const express = require("express");
const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");

const { initializeKafka, publishMessage, disconnectKafka } = require("./kafka");

const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4007);

function normalizeParticipantRole(role) {
  if (!role) return "MEMBER";
  const normalized = String(role).toUpperCase();
  return normalized === "HOST" ? "HOST" : "MEMBER";
}

function normalizeInviteStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ACCEPTED" || normalized === "DECLINED") {
    return normalized;
  }
  return "PENDING";
}

function extractPossibleParticipants(input = []) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") {
        return { userId: item, role: "MEMBER" };
      }

      if (item && typeof item === "object" && item.userId) {
        return {
          userId: String(item.userId),
          role: normalizeParticipantRole(item.role),
        };
      }

      return null;
    })
    .filter(Boolean);
}

async function startServer() {
  const app = express();

  // Initialize Kafka
  try {
    await initializeKafka();
  } catch (error) {
    console.warn(
      "Kafka initialization failed. Service will continue without Kafka:",
      error.message,
    );
  }

  app.use(cors());
  app.use(express.json());

  app.get("/", (_, res) => {
    res.status(200).json({
      status: "ok",
      service: "session-service",
      message: "Session service is running",
    });
  });

  // Health check endpoint
  app.get("/health", (_, res) => {
    res.status(200).json({
      status: "ok",
      service: "session-service",
      timestamp: new Date().toISOString(),
    });
  });

  // Get previous sessions (past sessions)
  app.get("/api/sessions/:userId/previous", async (req, res) => {
    try {
      const { userId } = req.params;
      const now = new Date();

      const previousSessions = await prisma.studySession.findMany({
        where: {
          dateTime: {
            lt: now,
          },
          OR: [
            {
              creatorId: userId,
            },
            {
              SessionParticipant: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        orderBy: { dateTime: "desc" },
      });

      res.json({ success: true, data: previousSessions });
    } catch (error) {
      console.error("Error fetching previous sessions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming sessions (future sessions)
  app.get("/api/sessions/:userId/upcoming", async (req, res) => {
    try {
      const { userId } = req.params;
      const now = new Date();

      const upcomingSessions = await prisma.studySession.findMany({
        where: {
          dateTime: {
            gte: now,
          },
          OR: [
            {
              creatorId: userId,
            },
            {
              SessionParticipant: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        orderBy: { dateTime: "asc" },
      });

      res.json({ success: true, data: upcomingSessions });
    } catch (error) {
      console.error("Error fetching upcoming sessions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a session
  app.post("/api/sessions", async (req, res) => {
    try {
      const {
        userId,
        title,
        description,
        startTime,
        endTime,
        sessionType = "ONLINE",
        location = null,
        contactInfo = null,
        possibleParticipants = [],
      } = req.body;

      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return res.status(400).json({ error: "Invalid startTime or endTime" });
      }

      const durationMins = Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / 60000),
      );
      const participantsToInvite = extractPossibleParticipants(
        possibleParticipants,
      )
        .filter((participant) => participant.userId !== userId)
        .filter(
          (participant, index, list) =>
            list.findIndex((p) => p.userId === participant.userId) === index,
        );

      const session = await prisma.studySession.create({
        data: {
          id: randomUUID(),
          topic: title,
          sessionType,
          location,
          dateTime: startDate,
          durationMins,
          creatorId: userId,
          contactInfo,
          updatedAt: new Date(),   // ← add this line
        },
      });

      // Creator is automatically registered as HOST participant.
      await prisma.sessionParticipant.create({
        data: {
          id: randomUUID(),
          sessionId: session.id,
          userId,
          role: "HOST",
          inviteStatus: "ACCEPTED",
          respondedAt: new Date(),
        },
      });

      if (participantsToInvite.length > 0) {
        await prisma.sessionParticipant.createMany({
          data: participantsToInvite.map((participant) => ({
            id: randomUUID(),
            sessionId: session.id,
            userId: participant.userId,
            role: normalizeParticipantRole(participant.role),
            inviteStatus: "PENDING",
          })),
          skipDuplicates: true,
        });
      }

      try {
        await publishMessage("study-events", {
          key: userId,
          value: JSON.stringify({
            event: "SESSION_CREATED",
            payload: {
              userId,
              sessionId: session.id,
              data: session,
            },
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (publishError) {
        console.warn(
          "Kafka publish failed, session saved anyway:",
          publishError.message,
        );
      }

      if (participantsToInvite.length > 0) {
        try {
          await publishMessage(
            "study-events",
            participantsToInvite.map((participant) => ({
              key: participant.userId,
              value: JSON.stringify({
                event: "SESSION_INVITATION_RECEIVED",
                payload: {
                  sessionId: session.id,
                  hostUserId: userId,
                  userId: participant.userId,
                  role: normalizeParticipantRole(participant.role),
                },
                timestamp: new Date().toISOString(),
              }),
            })),
          );
        } catch (publishError) {
          console.warn("Kafka invite publish failed:", publishError.message);
        }
      }

      res.json({ success: true, data: session });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update a session
  app.put("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const {
        userId,
        topic,
        startTime,
        endTime,
        sessionType,
        location,
        contactInfo,
      } = req.body;

      const existingSession = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Only the creator can update the session
      if (existingSession.creatorId !== userId) {
        return res
          .status(403)
          .json({ error: "Only the session creator can update the session" });
      }

      const startDate = startTime
        ? new Date(startTime)
        : existingSession.dateTime;
      const endDate = endTime ? new Date(endTime) : null;

      const durationMins = endDate
        ? Math.max(
            1,
            Math.round((endDate.getTime() - startDate.getTime()) / 60000),
          )
        : existingSession.durationMins;

      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          topic: topic || existingSession.topic,
          sessionType: sessionType || existingSession.sessionType,
          location:
            location !== undefined ? location : existingSession.location,
          dateTime: startDate,
          durationMins,
          contactInfo:
            contactInfo !== undefined
              ? contactInfo
              : existingSession.contactInfo,
          updatedAt: new Date(),
        },
      });

      try {
        await publishMessage("study-events", {
          key: userId,
          value: JSON.stringify({
            event: "SESSION_UPDATED",
            payload: {
              userId,
              sessionId: updatedSession.id,
              data: updatedSession,
            },
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (publishError) {
        console.warn(
          "Kafka session update publish failed:",
          publishError.message,
        );
      }

      res.json({ success: true, data: updatedSession });
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Assign a participant to a session.
  app.post("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId, role } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const existingSession = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      const participant = await prisma.sessionParticipant.upsert({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
        create: {
          id: randomUUID(),
          sessionId,
          userId,
          role: normalizeParticipantRole(role),
          inviteStatus: "PENDING",
        },
        update: {
          role: normalizeParticipantRole(role),
          inviteStatus: "PENDING",
          respondedAt: null,
        },
      });

      try {
        await publishMessage("study-events", {
          key: userId,
          value: JSON.stringify({
            event: "SESSION_INVITATION_RECEIVED",
            payload: {
              sessionId,
              hostUserId: existingSession.creatorId,
              userId,
              role: normalizeParticipantRole(participant.role),
            },
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (publishError) {
        console.warn("Kafka invite publish failed:", publishError.message);
      }

      res.json({ success: true, data: participant });
    } catch (error) {
      console.error("Error assigning participant:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get participants for a session.
  app.get("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;

      const participants = await prisma.sessionParticipant.findMany({
        where: { sessionId },
        orderBy: { joinedAt: "asc" },
      });

      res.json({ success: true, data: participants });
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept or decline an invite.
  app.patch(
    "/api/sessions/:sessionId/participants/:userId/respond",
    async (req, res) => {
      try {
        const { sessionId, userId } = req.params;
        const { status } = req.body;
        const inviteStatus = normalizeInviteStatus(status);

        if (inviteStatus === "PENDING") {
          return res.status(400).json({
            error: "status must be ACCEPTED or DECLINED",
          });
        }

        const participant = await prisma.sessionParticipant.update({
          where: {
            sessionId_userId: {
              sessionId,
              userId,
            },
          },
          data: {
            inviteStatus,
            respondedAt: new Date(),
          },
        });

        try {
          await publishMessage("study-events", {
            key: userId,
            value: JSON.stringify({
              event: "SESSION_INVITATION_RESPONDED",
              payload: {
                sessionId,
                userId,
                status: inviteStatus,
              },
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (publishError) {
          console.warn(
            "Kafka invite response publish failed:",
            publishError.message,
          );
        }

        res.json({ success: true, data: participant });
      } catch (error) {
        console.error("Error responding to invite:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Leave a session (cancel participation)
  app.delete(
    "/api/sessions/:sessionId/participants/:userId",
    async (req, res) => {
      try {
        const { sessionId, userId } = req.params;

        const existingParticipant = await prisma.sessionParticipant.findUnique({
          where: {
            sessionId_userId: {
              sessionId,
              userId,
            },
          },
        });

        if (!existingParticipant) {
          return res
            .status(404)
            .json({ error: "Participant not found in session" });
        }

        // Don't allow hosts to leave their own sessions
        if (existingParticipant.role === "HOST") {
          return res
            .status(400)
            .json({ error: "Session host cannot leave their own session" });
        }

        await prisma.sessionParticipant.delete({
          where: {
            sessionId_userId: {
              sessionId,
              userId,
            },
          },
        });

        try {
          await publishMessage("study-events", {
            key: userId,
            value: JSON.stringify({
              event: "SESSION_LEFT",
              payload: {
                sessionId,
                userId,
              },
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (publishError) {
          console.warn(
            "Kafka leave session publish failed:",
            publishError.message,
          );
        }

        res.json({ success: true, message: "Successfully left the session" });
      } catch (error) {
        console.error("Error leaving session:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.listen(port, () => {
    console.log(`Session service running on http://localhost:${port}`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await disconnectKafka();
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error("Failed to start session service", error);
  process.exit(1);
});
