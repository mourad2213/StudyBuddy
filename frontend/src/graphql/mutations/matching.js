import { gql } from "@apollo/client";

export const CREATE_BUDDY_REQUEST = gql`
  mutation CreateBuddyRequest($fromUserId: ID!, $toUserId: ID!) {
    createBuddyRequest(fromUserId: $fromUserId, toUserId: $toUserId) {
      id
      fromUserId
      toUserId
      status
      createdAt
    }
  }
`;

export const GENERATE_RECOMMENDATIONS = gql`
  mutation GenerateRecommendations($userId: ID!, $limit: Int) {
    generateRecommendations(userId: $userId, limit: $limit) {
      id
      userId
      candidateId
      score
      reasons {
        type
        description
        weight
      }
      createdAt
    }
  }
`;