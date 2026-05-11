import { getRecommendations, acceptMatch, WEIGHTS } from '../../matchingService.js';
import { produceEvent, MATCHING_EVENTS } from '../../kafka.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    getRecommendations: async (_, { userId, limit = 10 }) => {
      try {
        console.log(`[getRecommendations] Fetching for userId: ${userId}, limit: ${limit}`);
        
        // Direct database query to avoid the broken getUserNames() function
        const recommendations = await prisma.matchRecommendation.findMany({
          where: {
            OR: [
              { userId },
              { candidateId: userId },
            ],
          },
          orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
          take: limit,
        });
        
        console.log(`[getRecommendations] Found ${recommendations.length} recommendations`);
        return recommendations;
      } catch (error) {
        console.error('[getRecommendations] Error:', error.message);
        console.error('[getRecommendations] Stack:', error.stack);
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
  },

  Mutation: {
    acceptRecommendation: async (_, { userId, candidateId }) => {
      try {
        const result = await acceptMatch(userId, candidateId);
        
        await produceEvent(MATCHING_EVENTS.BUDDY_REQUEST_CREATED, {
          fromUserId: userId,
          toUserId: candidateId,
          type: 'MATCH_ACCEPTED',
        });
        
        return result;
      } catch (error) {
        console.error('Error accepting recommendation:', error);
        throw new Error('Failed to accept recommendation');
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
};
