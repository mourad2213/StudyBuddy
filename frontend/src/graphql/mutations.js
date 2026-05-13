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

export const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: ID!, $name: String!) {
    updateCourse(id: $id, name: $name) {
      id
      name
    }
  }
`;

export const UPDATE_TOPIC = gql`
  mutation UpdateTopic($id: ID!, $name: String!) {
    updateTopic(id: $id, name: $name) {
      id
      name
    }
  }
`;

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($participant1Id: String!, $participant2Id: String!) {
    createConversation(participant1Id: $participant1Id, participant2Id: $participant2Id) {
      id
      participant1Id
      participant2Id
    }
  }
`;