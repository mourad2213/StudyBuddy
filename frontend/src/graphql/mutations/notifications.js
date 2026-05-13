import { gql } from "@apollo/client";

export const MARK_AS_READ = gql`
  mutation MarkAsRead($notificationId: ID!) {
    markAsRead(notificationId: $notificationId) {
      id
      userId
      message
      type
      isRead
      createdAt
    }
  }
`;

export const MARK_ALL_AS_READ = gql`
  mutation MarkAllAsRead($userId: String!) {
    markAllAsRead(userId: $userId)
  }
`;

export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: ID!) {
    deleteNotification(notificationId: $notificationId)
  }
`;

export const UPDATE_NOTIFICATION_MESSAGE = gql`
  mutation UpdateNotificationMessage($notificationId: ID!, $message: String!) {
    updateNotificationMessage(notificationId: $notificationId, message: $message) {
      id
      userId
      message
      type
      isRead
      createdAt
    }
  }
`;
