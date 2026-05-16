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
  const g1 = user1.groupSize ?? 2;
  const g2 = user2.groupSize ?? 2;
  const groupSizeDiff = Math.abs(g1 - g2) <= 1;

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

  const recommendations = await prisma.matchRecommendation.findMany({
    where: {
      OR: [
        {
          userId,
          candidateId: {
            not: userId,
            notIn: unavailableCandidateIds,
          },
        },
        {
          candidateId: userId,
          userId: {
            not: userId,
            notIn: unavailableCandidateIds,
          },
        },
      ],
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return recommendations.map((recommendation) => {
    if (recommendation.userId === userId) {
      return recommendation;
    }

    return {
      ...recommendation,
      userId,
      candidateId: recommendation.userId,
    };
  });
}

async function fetchUserDataFromServices(userId) {
  console.log(`[fetchUserDataFromServices] Fetching data for user ${userId}`);
  
  try {
    // Fetch user profile from profile-service
    const profileResp = await fetch("http://profile-service:4006/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query GetProfile($userId: ID!) {
          getUserProfile(userId: $userId) {
            courses { name }
            topics
            preferences {
              studyPace
              studyMode
              groupSize
              studyStyle
            }
          }
        }`,
        variables: { userId },
      }),
    });

    const profileData = await profileResp.json();
    console.log(`[fetchUserDataFromServices] Profile response status: ${profileResp.status}`);
    
    const profile = profileData?.data?.getUserProfile || {};

    // Fetch availability from availability-service (port 4002)
    const availResp = await fetch("http://availability-service:4002/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query GetAvailability($userId: ID!) {
          getAvailability(userId: $userId) {
            dayOfWeek
            startTime
            endTime
          }
        }`,
        variables: { userId },
      }),
    });

    const availData = await availResp.json();
    console.log(`[fetchUserDataFromServices] Availability response status: ${availResp.status}`);
    
    const availability = availData?.data?.getAvailability || [];

    const userData = {
      id: userId,
      courses: profile.courses?.map(c => c.name) || [],
      topics: profile.topics || [],
      studyPace: profile.preferences?.studyPace || "moderate",
      studyMode: profile.preferences?.studyMode || "online",
      groupSize: profile.preferences?.groupSize || 2,
      studyStyle: profile.preferences?.studyStyle || "collaborative",
      availability: availability.map(a => ({
        day: a.dayOfWeek,
        start: a.startTime,
        end: a.endTime,
      })),
    };

    console.log(`[fetchUserDataFromServices] ✓ Fetched data:`, {
      courses: userData.courses.length,
      topics: userData.topics.length,
      studyPace: userData.studyPace,
    });

    return userData;
  } catch (error) {
    console.error(`[fetchUserDataFromServices] Network/fetch error:`, error.message);
    // Return minimal data with defaults instead of null
    return {
      id: userId,
      courses: [],
      topics: [],
      studyPace: "moderate",
      studyMode: "online",
      groupSize: 2,
      studyStyle: "collaborative",
      availability: [],
    };
  }
}

async function getAllCandidatesData(userId) {
  console.log(`[getAllCandidatesData] Fetching all candidates for ${userId}`);
  
  // First try to get from cache
  let cachedCandidates = await prisma.cachedUserData.findMany({
    where: { id: { not: userId } },
  });

  if (cachedCandidates.length > 0) {
    console.log(`[getAllCandidatesData] Found ${cachedCandidates.length} cached candidates`);
    return cachedCandidates;
  }

  console.log(`[getAllCandidatesData] No cached candidates, trying to fetch from services...`);

  try {
    // Fetch all user IDs from user-service (port 4001)
    const usersResp = await fetch("http://user-service:4001/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query GetAllUsers { getAllUsers { id } }`,
      }),
    });

    console.log(`[getAllCandidatesData] Users response status: ${usersResp.status}`);
    const usersData = await usersResp.json();
    const allUserIds = (usersData?.data?.getAllUsers || [])
      .map(u => u.id)
      .filter(id => id !== userId);

    console.log(`[getAllCandidatesData] Found ${allUserIds.length} users to fetch profiles for`);

    if (allUserIds.length === 0) {
      console.log(`[getAllCandidatesData] No other users found, returning empty`);
      return [];
    }

    // Fetch profiles for all users from profile-service (port 4006)
    const profileResp = await fetch("http://profile-service:4006/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query GetAllProfiles { getAllProfiles { userId courses { name } topics preferences { studyPace studyMode groupSize studyStyle } } }`,
      }),
    });

    console.log(`[getAllCandidatesData] Profiles response status: ${profileResp.status}`);
    const profileData = await profileResp.json();
    const candidates = (profileData?.data?.getAllProfiles || [])
      .filter(p => p.userId !== userId)
      .map(p => ({
        id: p.userId,
        courses: p.courses?.map(c => c.name) || [],
        topics: p.topics || [],
        studyPace: p.preferences?.studyPace || "moderate",
        studyMode: p.preferences?.studyMode || "online",
        groupSize: p.preferences?.groupSize || 2,
        studyStyle: p.preferences?.studyStyle || "collaborative",
        availability: [],
      }));

    console.log(`[getAllCandidatesData] ✓ Mapped ${candidates.length} candidate profiles`);
    return candidates;
  } catch (error) {
    console.error(`[getAllCandidatesData] Network/fetch error:`, error.message);
    // Return empty array instead of failing
    console.log(`[getAllCandidatesData] Returning empty candidates (services unavailable)`);
    return [];
  }
}

async function getAllUsersFromDatabase() {
  console.log(`[getAllUsersFromDatabase] Querying matching DB for all cached users...`);
  
  try {
    const users = await prisma.cachedUserData.findMany();
    console.log(`[getAllUsersFromDatabase] Found ${users.length} cached users in DB`);
    return users;
  } catch (error) {
    console.error(`[getAllUsersFromDatabase] ERROR:`, error.message);
    return [];
  }
}

export async function generateAndStoreRecommendations(userId) {
  console.log(`\n[generateAndStoreRecommendations] START - userId: ${userId}`);
  
  // Try cached data first
  let userData = await prisma.cachedUserData.findUnique({
    where: { id: userId },
  });

  if (!userData) {
    console.log(`[generateAndStoreRecommendations] No cached data for user, fetching from services...`);
    userData = await fetchUserDataFromServices(userId);
  }

  console.log(`[generateAndStoreRecommendations] User data ready:`, {
    id: userData?.id,
    courses: userData?.courses?.length || 0,
    topics: userData?.topics?.length || 0,
    studyPace: userData?.studyPace,
    studyMode: userData?.studyMode,
  });

  // Try to get candidates from cache first, fall back to services
  let allCandidates = await prisma.cachedUserData.findMany({
    where: { id: { not: userId } },
  });

  if (allCandidates.length === 0) {
    console.log(`[generateAndStoreRecommendations] No cached candidates, trying service fetch...`);
    allCandidates = await getAllCandidatesData(userId);
  } else {
    console.log(`[generateAndStoreRecommendations] Using ${allCandidates.length} cached candidates`);
  }

  console.log(`[generateAndStoreRecommendations] Found ${allCandidates.length} total candidates`);
  
  if (allCandidates.length === 0) {
    console.warn(`[generateAndStoreRecommendations] WARNING: No candidates available - populate cachedUserData table first`);
    return [];
  }

  const unavailableCandidateIds = await getUnavailableCandidateIds(userId);
  console.log(`[generateAndStoreRecommendations] Unavailable candidates: ${unavailableCandidateIds.length}`);

  const recommendations = [];

  for (const candidate of allCandidates) {
    if (unavailableCandidateIds.includes(candidate.id)) {
      console.log(`[generateAndStoreRecommendations] Skipping candidate ${candidate.id} (unavailable)`);
      continue;
    }

    const compatibility = await calculateCompatibility(userId, candidate);
    console.log(`[generateAndStoreRecommendations] Candidate ${candidate.id}: score=${compatibility.score}, reasons=${compatibility.reasons.length}`);

    try {
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

      console.log(`[generateAndStoreRecommendations] ✓ Upserted recommendation id=${recommendation.id} score=${recommendation.score}`);
      recommendations.push(recommendation);
    } catch (error) {
      console.error(`[generateAndStoreRecommendations] ERROR upserting candidate ${candidate.id}:`, error.message);
    }
  }

  console.log(`[generateAndStoreRecommendations] COMPLETE - stored ${recommendations.length} recommendations\n`);
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
