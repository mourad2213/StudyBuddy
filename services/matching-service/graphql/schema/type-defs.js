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
    getIncomingBuddyRequests(userId: ID!): [BuddyRequest!]!
    getOutgoingBuddyRequests(userId: ID!): [BuddyRequest!]!
    getConnections(userId: ID!): [BuddyRequest!]!
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
    createBuddyRequest(fromUserId: ID!, toUserId: ID!): BuddyRequest
    acceptBuddyRequest(fromUserId: ID!, toUserId: ID!): BuddyRequest
    rejectBuddyRequest(fromUserId: ID!, toUserId: ID!): BuddyRequest
  }

  enum BuddyRequestStatus {
    PENDING
    ACCEPTED
    REJECTED
  }

  type BuddyRequest {
    id: ID!
    fromUserId: String!
    toUserId: String!
    status: BuddyRequestStatus!
    createdAt: String!
  }
`;
