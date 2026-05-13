import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";

import NotificationItem from "../components/notifications/NotificationItem";

import { GET_NOTIFICATIONS } from "../graphql/queries/notifications";
import { GET_PENDING_INVITATIONS } from "../graphql/queries/sessions";
import {
  MARK_AS_READ,
  MARK_ALL_AS_READ,
  DELETE_NOTIFICATION,
  UPDATE_NOTIFICATION_MESSAGE,
} from "../graphql/mutations/notifications";
import { RESPOND_TO_SESSION_INVITATION } from "../graphql/mutations/sessions";

import notificationArrow from "../assets/notification-arrow.png";
import "../App.css";
export default function NotificationsPage() {
  const currentUserId = localStorage.getItem("userid");

  const [searchTerm, setSearchTerm] = useState("");

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_NOTIFICATIONS, {
    variables: { userId: currentUserId },
    skip: !currentUserId,
    fetchPolicy: "cache-and-network",
    pollInterval: 30000,
    context: {
      uri: "http://localhost:4005/graphql",
    },
  });

  const { data: pendingData, refetch: refetchPendingInvitations } = useQuery(
    GET_PENDING_INVITATIONS,
    {
      variables: { userId: currentUserId },
      skip: !currentUserId,
      fetchPolicy: "cache-and-network",
      pollInterval: 30000,
      context: {
        uri: "http://localhost:4007/graphql",
      },
    }
  );

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

  const [updateNotificationMessage] = useMutation(UPDATE_NOTIFICATION_MESSAGE, {
    context: {
      uri: "http://localhost:4005/graphql",
    },
  });

  const [respondToInvitation] = useMutation(RESPOND_TO_SESSION_INVITATION, {
    context: {
      uri: "http://localhost:4007/graphql",
    },
  });

  const notifications = useMemo(() => {
    const pendingSessions = pendingData?.getPendingInvitations || [];

    return (data?.getNotifications || []).map((notification) => {
      if (notification.type !== "SESSION_INVITATION_RECEIVED") {
        return notification;
      }

      const normalizedMessage = notification.message.toLowerCase();
      const matchingPendingSessions = pendingSessions.filter((session) => {
        return session.topic && normalizedMessage.includes(session.topic.toLowerCase());
      });

      return {
        ...notification,
        topic: matchingPendingSessions[0]?.topic,
        pendingSessions:
          matchingPendingSessions.length > 0
            ? matchingPendingSessions
            : pendingSessions,
      };
    });
  }, [data?.getNotifications, pendingData?.getPendingInvitations]);

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

  // Check if there are any notifications at all
  const hasAnyNotifications = notifications.length > 0;
  const isFilteredBySearch = searchTerm && filteredNotifications.length === 0 && hasAnyNotifications;

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

  const handleRespondToInvitation = async ({
    sessionId,
    status,
    notificationId,
    notificationMessage,
  }) => {
    console.debug("NotificationsPage: respondToInvitation called", {
      sessionId,
      status,
      notificationId,
      userId: currentUserId,
    });

    try {
      const result = await respondToInvitation({
        variables: {
          sessionId,
          userId: currentUserId,
          status,
        },
      });

      console.debug("NotificationsPage: respondToInvitation result", { result });

      const baseMessage = (notificationMessage || "")
        .replace(/\[SESSION_ID:[^\]]+\]\s*/g, "")
        .replace(/\s*\[INVITATION_RESPONSE:(ACCEPTED|REJECTED)\]\s*/g, " ")
        .trim();

      try {
        await updateNotificationMessage({
          variables: {
            notificationId,
            message: `[SESSION_ID:${sessionId}] ${baseMessage} [INVITATION_RESPONSE:${status}]`,
          },
        });
      } catch (notificationUpdateError) {
        console.warn("Failed to update notification response label", {
          error: notificationUpdateError,
          notificationId,
          sessionId,
          status,
        });
      }

      alert(`Session invitation ${status.toLowerCase()}!`);

      await refetch();
      await refetchPendingInvitations();
    } catch (err) {
      console.error("NotificationsPage: respondToInvitation error", {
        error: err,
        sessionId,
        status,
        notificationId,
      });
      alert(err.message || "Failed to respond to session invitation. See console for details.");
      throw err;
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
        {filteredNotifications.length === 0 && !hasAnyNotifications ? (
          <p className="notifications-empty">You're all caught up! ✓</p>
        ) : filteredNotifications.length === 0 && isFilteredBySearch ? (
          <p className="notifications-empty">No notifications match "{searchTerm}"</p>
        ) : (
          <>
            <h3 className="notifications-section-title">New!</h3>

            {unreadNotifications.length === 0 ? (
              <p className="no-read-notifications">No new notifications.</p>
            ) : (
              unreadNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  currentUserId={currentUserId}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onRespondToInvitation={handleRespondToInvitation}
                />
              ))
            )}

            <h3 className="notifications-section-title">Read:</h3>

            {readNotifications.length === 0 ? (
              <p className="no-read-notifications">No read notifications yet.</p>
            ) : (
              readNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  currentUserId={currentUserId}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onRespondToInvitation={handleRespondToInvitation}
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
