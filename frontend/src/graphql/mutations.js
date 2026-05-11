import { gql } from "@apollo/client/core";

export const CREATE_STUDY_SESSION = gql`
  mutation CreateStudySession($input: CreateStudySessionInput!) {
    createStudySession(input: $input) {
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