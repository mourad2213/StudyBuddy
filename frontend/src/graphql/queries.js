import { gql } from "@apollo/client/core";

export const GET_UPCOMING_SESSIONS = gql`
  query GetUpcomingSessions($userId: String!) {
    upcomingSessions(userId: $userId) {
      id
      topic
      sessionType
      location
      dateTime
      durationMins
      creatorId
      participants {
        userId
        role
        inviteStatus
        joinedAt
      }
    }
  }
`;

export const GET_PAST_SESSIONS = gql`
  query GetPastSessions($userId: String!) {
    pastSessions(userId: $userId) {
      id
      topic
      sessionType
      location
      dateTime
      durationMins
      creatorId
      participants {
        userId
        role
        inviteStatus
        joinedAt
      }
    }
  }
`;

export const GET_ALL_PROFILES = gql`
  query GetAllProfiles {
    getAllProfiles {
      id
      userId
      courses {
        id
        name
      }
      topics {
        id
        name
      }
    }
  }
`;