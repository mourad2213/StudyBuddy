import { gql } from "@apollo/client";

export const GET_RECOMMENDATIONS = gql`
  query GetRecommendations($userId: ID!, $limit: Int) {
    getRecommendations(userId: $userId, limit: $limit) {
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