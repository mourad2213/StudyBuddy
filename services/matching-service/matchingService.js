import { PrismaClient } from "@prisma/client";
import { MATCHING_WEIGHTS } from "./kafka.js";

const prisma = new PrismaClient();

export const WEIGHTS = MATCHING_WEIGHTS;



export async function calculateCompatibility(userId, candidateData) {
  const cachedUser = await prisma.cachedUserData.findUnique({
    where: { id: userId },
  });

  if (!cachedUser) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];

  const sharedCourses =
    candidateData.courses?.filter((course) =>
      cachedUser.courses.includes(course)
    ) || [];

  const courseScore = Math.min(100, sharedCourses.length * 40);
  score += (courseScore / 100) * WEIGHTS.SHARED_COURSES;
  if (sharedCourses.length > 0) {
    reasons.push({
      type: "SHARED_COURSES",
      description: `Both enrolled in: ${sharedCourses.join(", ")}`,
      weight: WEIGHTS.SHARED_COURSES,
    });
  }

  const sharedTopics =
    candidateData.topics?.filter((topic) =>
      cachedUser.topics.includes(topic)
    ) || [];

  const topicScore = Math.min(100, sharedTopics.length * 50);
  score += (topicScore / 100) * WEIGHTS.SHARED_TOPICS;
  if (sharedTopics.length > 0) {
    reasons.push({
      type: "SHARED_TOPICS",
      description: `Similar study topics: ${sharedTopics.join(", ")}`,
      weight: WEIGHTS.SHARED_TOPICS,
    });
  }

  const overlapHours = calculateAvailabilityOverlap(
    cachedUser.availability,
    candidateData.availability
  );
  const availabilityScore = Math.min(100, overlapHours * 20);
  score += (availabilityScore / 100) * WEIGHTS.OVERLAPPING_AVAILABILITY;
  if (overlapHours > 0) {
    reasons.push({
      type: "AVAILABILITY",
      description: `${overlapHours} hours of overlapping availability`,
      weight: WEIGHTS.OVERLAPPING_AVAILABILITY,
    });
  }

  const preferencesMatch = checkPreferencesMatch(cachedUser, candidateData);
  if (preferencesMatch) {
    score += WEIGHTS.PREFERENCES_MATCH;
    reasons.push({
      type: "PREFERENCES",
      description: "Compatible study preferences",
      weight: WEIGHTS.PREFERENCES_MATCH,
    });
  }

  const styleMatch = cachedUser.studyStyle === candidateData.studyStyle;
  if (styleMatch) {
    score += WEIGHTS.STUDY_STYLE;
    reasons.push({
      type: "STUDY_STYLE",
      description: `Same study style: ${cachedUser.studyStyle}`,
      weight: WEIGHTS.STUDY_STYLE,
    });
  }

  return {
    score: Math.round(score),
    reasons,
  };
}

function calculateAvailabilityOverlap(avail1, avail2) {
  if (!avail1 || !avail2) return 0;

  const slots1 = Array.isArray(avail1) ? avail1 : JSON.parse(avail1);
  const slots2 = Array.isArray(avail2) ? avail2 : JSON.parse(avail2);

  let overlapHours = 0;

  for (const slot1 of slots1) {
    for (const slot2 of slots2) {
      if (slot1.day === slot2.day) {
        const start1 = timeToMinutes(slot1.start);
        const end1 = timeToMinutes(slot1.end);
        const start2 = timeToMinutes(slot2.start);
        const end2 = timeToMinutes(slot2.end);

        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);

        if (overlapStart < overlapEnd) {
          overlapHours += (overlapEnd - overlapStart) / 60;
        }
      }
    }
  }

  return Math.round(overlapHours * 2) / 2;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function checkPreferencesMatch(user1, user2) {
  const paceMatch = user1.studyPace === user2.studyPace;
  const modeMatch = user1.studyMode === user2.studyMode;
  const groupSizeDiff = Math.abs(user1.groupSize - user2.groupSize) <= 1;

  return paceMatch && modeMatch && groupSizeDiff;
}

async function getUnavailableCandidateIds(userId) {
  const requests = await prisma.buddyRequest.findMany({
    where: {
      status: {
        in: ["PENDING", "ACCEPTED"],
      },
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    select: {
      fromUserId: true,
      toUserId: true,
    },
  });

  return [
    ...new Set(
      requests.flatMap((request) => [request.fromUserId, request.toUserId])
    ),
  ].filter((candidateId) => candidateId !== userId);
}

export async function getRecommendations(userId, limit = 10) {
  const unavailableCandidateIds = await getUnavailableCandidateIds(userId);

  return prisma.matchRecommendation.findMany({
    where: {
      userId,
      candidateId: {
        not: userId,
        notIn: unavailableCandidateIds,
      },
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function generateAndStoreRecommendations(userId) {
  const userData = await prisma.cachedUserData.findUnique({
    where: { id: userId },
  });

  if (!userData) {
    return [];
  }

  const allCandidates = await prisma.cachedUserData.findMany({
    where: {
      id: {
        not: userId,
      },
    },
  });
  const unavailableCandidateIds = await getUnavailableCandidateIds(userId);

  const recommendations = [];

  for (const candidate of allCandidates) {
    if (unavailableCandidateIds.includes(candidate.id)) {
      continue;
    }

    const compatibility = await calculateCompatibility(userId, candidate);

    const recommendation = await prisma.matchRecommendation.upsert({
      where: {
        userId_candidateId: {
          userId,
          candidateId: candidate.id,
        },
      },
      update: {
        score: compatibility.score,
        reasons: compatibility.reasons,
        updatedAt: new Date(),
      },
      create: {
        userId,
        candidateId: candidate.id,
        score: compatibility.score,
        reasons: compatibility.reasons,
      },
    });

    recommendations.push(recommendation);
  }

  return recommendations;
}

export async function acceptMatch(userId, candidateId) {
  return prisma.matchRecommendation.update({
    where: {
      userId_candidateId: {
        userId,
        candidateId,
      },
    },
    data: {
      isAccepted: true,
    },
  });
}

export async function createBuddyRequest(fromUserId, toUserId) {
  return prisma.buddyRequest.upsert({
    where: {
      fromUserId_toUserId: {
        fromUserId,
        toUserId,
      },
    },
    update: {
      status: "PENDING",
      updatedAt: new Date(),
    },
    create: {
      fromUserId,
      toUserId,
      status: "PENDING",
    },
  });
}

export async function updateBuddyRequestStatus(fromUserId, toUserId, status) {
  return prisma.buddyRequest.update({
    where: {
      fromUserId_toUserId: {
        fromUserId,
        toUserId,
      },
    },
    data: {
      status,
    },
  });
}

export async function getIncomingBuddyRequests(userId) {
  return prisma.buddyRequest.findMany({
    where: {
      toUserId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getOutgoingBuddyRequests(userId) {
  return prisma.buddyRequest.findMany({
    where: {
      fromUserId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getConnections(userId) {
  return prisma.buddyRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export { prisma };
