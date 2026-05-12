import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";

import NotificationItem from "../components/notifications/NotificationItem";

import { GET_NOTIFICATIONS } from "../graphql/queries/notifications";
import {
  MARK_AS_READ,
  MARK_ALL_AS_READ,
  DELETE_NOTIFICATION,
} from "../graphql/mutations/notifications";

import notificationArrow from "../assets/notification-arrow.png";

export default function NotificationsPage() {
  const currentUserId = localStorage.getItem("userId");

  const [searchTerm, setSearchTerm] = useState("");

  const { data, loading, error, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { userId: currentUserId },
    skip: !currentUserId,
    fetchPolicy: "cache-and-network",
    pollInterval: 30000,
    context: {
      uri: "http://localhost:4005/graphql",
    },
  });

  const [markAsRead] = useMutation(MARK_AS_READ, {
    context: {
      uri: "http://localhost:4005/graphql",
    },
  });

  const [markAllAsRead, { loading: markingAll }] = useMutation(
    MARK_ALL_AS_READ,
    {
      context: {
        uri: "http://localhost:4005/graphql",
      },
    }
  );

  const [deleteNotification] = useMutation(DELETE_NOTIFICATION, {
    context: {
      uri: "http://localhost:4005/graphql",
    },
  });

  const notifications = data?.getNotifications || [];

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notification) =>
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, searchTerm]);

  const unreadNotifications = filteredNotifications.filter(
    (notification) => !notification.isRead
  );

  const readNotifications = filteredNotifications.filter(
    (notification) => notification.isRead
  );

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead({
        variables: { notificationId },
      });

      await refetch();
    } catch (err) {
      alert(err.message || "Failed to mark notification as read.");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({
        variables: { userId: currentUserId },
      });

      await refetch();
    } catch (err) {
      alert(err.message || "Failed to mark all notifications as read.");
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification({
        variables: { notificationId },
      });

      await refetch();
    } catch (err) {
      alert(err.message || "Failed to delete notification.");
    }
  };

  if (!currentUserId) {
    return (
      <main className="notifications-page">
        <p className="notifications-error">
          You must be logged in to view notifications.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="notifications-page">
        <p className="notifications-loading">Loading notifications...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="notifications-page">
        <p className="notifications-error">{error.message}</p>
      </main>
    );
  }

  return (
    <main className="notifications-page">
      <section className="notifications-heading">
        <h1>StudyBuddy</h1>
        <h2>Notifications</h2>
        <img
            src={notificationArrow}
            alt=""
            className="notifications-arrow"
        />
      </section>

      <section className="notifications-top-actions">
        <div></div>

        <input
          type="text"
          className="notifications-search"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search notifications"
        />
      </section>

      {unreadNotifications.length > 0 && (
        <div className="mark-all-wrapper">
          <button
            className="mark-all-btn"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        </div>
      )}

      <section className="notifications-panel">
        {filteredNotifications.length === 0 ? (
          <p className="notifications-empty">You're all caught up! ✓</p>
        ) : (
          <>
            {unreadNotifications.length > 0 && (
              <>
                <h3 className="notifications-section-title">New!</h3>

                {unreadNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}

            <h3 className="notifications-section-title">Read:</h3>

            {readNotifications.length === 0 ? (
              <p className="no-read-notifications">No read notifications yet.</p>
            ) : (
              readNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))
            )}
          </>
        )}
      </section>

      <p className="no-more-notifications">no more notifications!</p>
    </main>
  );
}