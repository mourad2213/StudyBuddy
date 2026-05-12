import {
  getRecommendations,
  acceptMatch,
  createBuddyRequest,
  updateBuddyRequestStatus,
  getIncomingBuddyRequests,
  getOutgoingBuddyRequests,
  getConnections,
  WEIGHTS,
} from "../../matchingService.js";
import { produceEvent, MATCHING_EVENTS } from "../../kafka.js";

export const resolvers = {
  Query: {
    getRecommendations: async (_, { userId, limit = 10 }) => {
      try {
        console.log(
          `[getRecommendations] Fetching for userId: ${userId}, limit: ${limit}`
        );

        const recommendations = await getRecommendations(userId, limit);

        console.log(
          `[getRecommendations] Found ${recommendations.length} recommendations`
        );

        return recommendations;
      } catch (error) {
        console.error("[getRecommendations] Error:", error.message);
        console.error("[getRecommendations] Stack:", error.stack);
        throw new Error(`Failed to fetch recommendations: ${error.message}`);
      }
    },

    getMatchingWeights: async () => {
      return {
        sharedCourses: WEIGHTS.SHARED_COURSES,
        sharedTopics: WEIGHTS.SHARED_TOPICS,
        overlappingAvailability: WEIGHTS.OVERLAPPING_AVAILABILITY,
        preferencesMatch: WEIGHTS.PREFERENCES_MATCH,
        studyStyle: WEIGHTS.STUDY_STYLE,
      };
    },
    getIncomingBuddyRequests: async (_, { userId }) => {
      try {
        return await getIncomingBuddyRequests(userId);
      } catch (error) {
        console.error("Error fetching incoming buddy requests:", error);
        throw new Error("Failed to fetch incoming buddy requests");
      }
    },
    getOutgoingBuddyRequests: async (_, { userId }) => {
      try {
        return await getOutgoingBuddyRequests(userId);
      } catch (error) {
        console.error("Error fetching outgoing buddy requests:", error);
        throw new Error("Failed to fetch outgoing buddy requests");
      }
    },
    getConnections: async (_, { userId }) => {
      try {
        return await getConnections(userId);
      } catch (error) {
        console.error("Error fetching connections:", error);
        throw new Error("Failed to fetch connections");
      }
    },
  },

  Mutation: {
    acceptRecommendation: async (_, { userId, candidateId }) => {
      try {
        const result = await acceptMatch(userId, candidateId);

        await produceEvent(MATCHING_EVENTS.BUDDY_REQUEST_CREATED, {
          fromUserId: userId,
          toUserId: candidateId,
          type: "MATCH_ACCEPTED",
        });

        return result;
      } catch (error) {
        console.error("Error accepting recommendation:", error);
        throw new Error("Failed to accept recommendation");
      }
    },
    createBuddyRequest: async (_, { fromUserId, toUserId }) => {
      try {
        return await createBuddyRequest(fromUserId, toUserId);
      } catch (error) {
        console.error("Error creating buddy request:", error);
        throw new Error("Failed to create buddy request");
      }
    },
    acceptBuddyRequest: async (_, { fromUserId, toUserId }) => {
      try {
        return await updateBuddyRequestStatus(fromUserId, toUserId, "ACCEPTED");
      } catch (error) {
        console.error("Error accepting buddy request:", error);
        throw new Error("Failed to accept buddy request");
      }
    },
    rejectBuddyRequest: async (_, { fromUserId, toUserId }) => {
      try {
        return await updateBuddyRequestStatus(fromUserId, toUserId, "REJECTED");
      } catch (error) {
        console.error("Error rejecting buddy request:", error);
        throw new Error("Failed to reject buddy request");
      }
    },
  },

  MatchRecommendation: {
    id: (parent) => parent.id,
    userId: (parent) => parent.userId,
    candidateId: (parent) => parent.candidateId,
    score: (parent) => parent.score,
    reasons: (parent) => parent.reasons || [],
    createdAt: (parent) => parent.createdAt.toISOString(),
  },
  BuddyRequest: {
    id: (parent) => parent.id,
    fromUserId: (parent) => parent.fromUserId,
    toUserId: (parent) => parent.toUserId,
    status: (parent) => parent.status,
    createdAt: (parent) => parent.createdAt.toISOString(),
  },
};