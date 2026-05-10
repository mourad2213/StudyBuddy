import { useQuery } from "@apollo/client/react";
import { GET_UNREAD_COUNT } from "../../graphql/queries/notifications";

export default function NotificationBadge({ userId }) {
  const { data } = useQuery(GET_UNREAD_COUNT, {
    variables: { userId },
    skip: !userId,
    pollInterval: 30000,
    context: {
      uri: "http://localhost:4005/graphql",
    },
  });

  const count = data?.getUnreadCount || 0;

  if (count === 0) return null;

  return <span className="notification-badge">{count}</span>;
}