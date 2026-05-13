import { gql } from "@apollo/client";

export const GET_PENDING_INVITATIONS = gql`
  query GetPendingInvitations($userId: String!) {
    getPendingInvitations(userId: $userId) {
      id
      topic
      sessionType
      location
      dateTime
      durationMins
      creatorId
      contactInfo
      participants {
        userId
        role
        inviteStatus
        joinedAt
      }
    }
  }
`;

export const GET_SESSION_BY_ID = gql`
  query GetSessionById($id: ID!) {
    sessionById(id: $id) {
      id
      topic
      sessionType
      location
      dateTime
      durationMins
      creatorId
      contactInfo
      participants {
        userId
        role
        inviteStatus
        joinedAt
      }
    }
  }
`;

export const GET_SESSION_ACCEPTED_MEMBERS = gql`
  query GetSessionAcceptedMembers($sessionId: ID!) {
    getSessionAcceptedMembers(sessionId: $sessionId) {
      userId
      role
      joinedAt
    }
  }
`;
