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