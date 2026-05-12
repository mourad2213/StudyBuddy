import { gql } from "@apollo/client";

export const MARK_AS_READ = gql`
  mutation MarkAsRead($notificationId: String!) {
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
  mutation DeleteNotification($notificationId: String!) {
    deleteNotification(notificationId: $notificationId)
  }
`;