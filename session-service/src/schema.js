const { gql } = require("graphql-tag");

const typeDefs = gql`
  scalar DateTime

  enum SessionType {
    ONLINE
    OFFLINE
  }

  enum ParticipantRole {
    HOST
    MEMBER
  }

  type SessionParticipant {
    id: ID!
    userId: String!
    role: ParticipantRole!
    joinedAt: DateTime!
  }

  type StudySession {
    id: ID!
    topic: String!
    sessionType: SessionType!
    location: String
    dateTime: DateTime!
    durationMins: Int!
    creatorId: String!
    contactInfo: String
    createdAt: DateTime!
    updatedAt: DateTime!
    participants: [SessionParticipant!]!
  }

  input CreateStudySessionInput {
    topic: String!
    sessionType: SessionType!
    location: String
    dateTime: DateTime!
    durationMins: Int!
    creatorId: String!
    contactInfo: String
  }

  type Query {
    upcomingSessions(userId: String!): [StudySession!]!
    pastSessions(userId: String!): [StudySession!]!
    sessionById(id: ID!): StudySession
  }

  type Mutation {
    createStudySession(input: CreateStudySessionInput!): StudySession!
    joinSession(sessionId: ID!, userId: String!): StudySession!
    leaveSession(sessionId: ID!, userId: String!): StudySession!
    cancelSession(id: ID!, requesterId: String!): Boolean!
  }
`;

module.exports = typeDefs;
