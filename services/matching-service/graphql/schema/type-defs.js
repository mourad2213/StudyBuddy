export const typeDefs = `#graphql
  type MatchRecommendation {
    id: ID!
    userId: String!
    candidateId: String!
    score: Int!
    reasons: [MatchReason!]!
    createdAt: String!
  }

  type MatchReason {
    type: String!
    description: String!
    weight: Int!
  }

  type Query {
    getRecommendations(userId: ID!, limit: Int): [MatchRecommendation!]!
    getMatchingWeights: MatchingWeights
  }

  type MatchingWeights {
    sharedCourses: Int!
    sharedTopics: Int!
    overlappingAvailability: Int!
    preferencesMatch: Int!
    studyStyle: Int!
  }

  type Mutation {
    acceptRecommendation(userId: ID!, candidateId: ID!): MatchRecommendation
  }
`;
