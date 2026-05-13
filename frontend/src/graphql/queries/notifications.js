import { gql } from "@apollo/client";

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: String!) {
    getNotifications(userId: $userId) {
      id
      userId
      message
      type
      isRead
      createdAt
    }
  }
`;

export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount($userId: String!) {
    getUnreadCount(userId: $userId)
  }
`;