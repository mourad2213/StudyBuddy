import { gql } from "@apollo/client";

export const GET_INCOMING_BUDDY_REQUESTS = gql`
  query GetIncomingBuddyRequests($userId: ID!) {
    getIncomingBuddyRequests(userId: $userId) {
      id
      fromUserId
      toUserId
      status
      createdAt
    }
  }
`;

export const GET_OUTGOING_BUDDY_REQUESTS = gql`
  query GetOutgoingBuddyRequests($userId: ID!) {
    getOutgoingBuddyRequests(userId: $userId) {
      id
      fromUserId
      toUserId
      status
      createdAt
    }
  }
`;

export const GET_CONNECTIONS = gql`
  query GetConnections($userId: ID!) {
    getConnections(userId: $userId) {
      id
      fromUserId
      toUserId
      status
      createdAt
    }
  }
`;

export const CREATE_BUDDY_REQUEST = gql`
  mutation CreateBuddyRequest($fromUserId: ID!, $toUserId: ID!) {
    createBuddyRequest(fromUserId: $fromUserId, toUserId: $toUserId) {
      id
      fromUserId
      toUserId
      status
    }
  }
`;

export const ACCEPT_BUDDY_REQUEST = gql`
  mutation AcceptBuddyRequest($fromUserId: ID!, $toUserId: ID!) {
    acceptBuddyRequest(fromUserId: $fromUserId, toUserId: $toUserId) {
      id
      fromUserId
      toUserId
      status
    }
  }
`;

export const REJECT_BUDDY_REQUEST = gql`
  mutation RejectBuddyRequest($fromUserId: ID!, $toUserId: ID!) {
    rejectBuddyRequest(fromUserId: $fromUserId, toUserId: $toUserId) {
      id
      fromUserId
      toUserId
      status
    }
  }
`;
