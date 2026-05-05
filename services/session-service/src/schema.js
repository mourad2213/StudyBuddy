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

  enum ParticipantStatus {
    PENDING
    ACCEPTED
    REJECTED
  }

  type SessionParticipant {
    id: ID!
    userId: String!
    role: ParticipantRole!
    inviteStatus: ParticipantStatus!
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

  type AcceptedMember {
    userId: String!
    role: ParticipantRole!
    joinedAt: DateTime!
  }

  input CreateStudySessionInput {
    topic: String!
    sessionType: SessionType!
    location: String
    dateTime: DateTime!
    durationMins: Int!
    creatorId: String!
    contactInfo: String
    possibleMemberIds: [String!]!
  }

  type Query {
    upcomingSessions(userId: String!): [StudySession!]!
    pastSessions(userId: String!): [StudySession!]!
    sessionById(id: ID!): StudySession
    getSessionAcceptedMembers(sessionId: ID!): [AcceptedMember!]!
    getPendingInvitations(userId: String!): [StudySession!]!
  }

  type Mutation {
    createStudySession(input: CreateStudySessionInput!): StudySession!
    respondToSessionInvitation(sessionId: ID!, userId: String!, status: ParticipantStatus!): SessionParticipant!
    joinSession(sessionId: ID!, userId: String!): StudySession!
    leaveSession(sessionId: ID!, userId: String!): StudySession!
    cancelSession(id: ID!, requesterId: String!): Boolean!
  }
`;

module.exports = typeDefs;
