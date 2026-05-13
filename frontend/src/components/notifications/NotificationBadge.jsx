import { useQuery } from "@apollo/client/react";
import API_CONFIG from "../../config/api";
import { GET_UNREAD_COUNT } from "../../graphql/queries/notifications";

export default function NotificationBadge({ userId }) {
  const { data } = useQuery(GET_UNREAD_COUNT, {
    variables: { userId },
    skip: !userId,
    pollInterval: 30000,
    context: {
      uri: API_CONFIG.NOTIFICATION_SERVICE,
    },
  });

  const count = data?.getUnreadCount || 0;

  if (count === 0) return null;

  return <span className="notification-badge">{count}</span>;
}