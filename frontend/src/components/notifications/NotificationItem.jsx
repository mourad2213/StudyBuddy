import { useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import API_CONFIG from "../../config/api";
import { GET_PAST_SESSIONS, GET_UPCOMING_SESSIONS } from "../../graphql/queries";

import {
  GET_PENDING_INVITATIONS,
  GET_SESSION_ACCEPTED_MEMBERS,
  GET_SESSION_BY_ID,
} from "../../graphql/queries/sessions";

function getRelativeTime(dateString) {
  if (!dateString) return "";
  
  const created = new Date(
    isNaN(dateString) ? dateString : Number(dateString)  // handle both ISO strings and unix timestamps
  );

  if (isNaN(created.getTime())) return "";  // guard against invalid dates

  const now = new Date();

  const diffMs = now - created;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
}

function getIcon(type) {
  if (type?.includes("MESSAGE")) return "✉";
  if (type?.includes("SESSION")) return "✉";
  if (type?.includes("RECOMMENDATION")) return "✉";
  if (type?.includes("BUDDY")) return "✉";
  return "✉";
}

function findMatchingPendingSession(notification, pendingSessions) {
  if (!Array.isArray(pendingSessions) || pendingSessions.length === 0) {
    return null;
  }

  const topic = notification.topic?.toLowerCase();
  const message = notification.message?.toLowerCase() || "";
  const quotedTopic = notification.message?.match(/"([^"]+)"/)?.[1]?.toLowerCase();

  const matchingSession = pendingSessions.find((session) => {
    const sessionTopic = session?.topic?.toLowerCase();
    return (
      sessionTopic &&
      (sessionTopic === topic ||
        sessionTopic === quotedTopic ||
        message.includes(sessionTopic))
    );
  });

  return matchingSession || pendingSessions[0];
}

function findMatchingSession(notification, sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return null;
  }

  return findMatchingPendingSession(notification, sessions);
}

function getSessionIdFromNotification(notification, pendingSessions) {
  const directSessionId =
    notification.sessionId ||
    notification.data?.sessionId ||
    notification.payload?.sessionId ||
    notification.metadata?.sessionId;

  if (directSessionId) {
    return directSessionId;
  }

  const pendingSession = findMatchingPendingSession(notification, pendingSessions);

  if (pendingSession?.id || pendingSession?.sessionId) {
    return pendingSession.id || pendingSession.sessionId;
  }

  const patterns = [/\[SESSION_ID:([^\]]+)\]/, /SESSION_ID:([^\s]+)/];

  for (const pattern of patterns) {
    const match = notification.message?.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function formatDateTime(dateTime) {
  if (!dateTime) return "Not set";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function getInvitationResponseStatus(message) {
  const match = message?.match(/\[INVITATION_RESPONSE:(ACCEPTED|REJECTED)\]/);
  return match?.[1] || null;
}

export default function NotificationItem({
  notification,
  currentUserId,
  onMarkAsRead,
  onDelete,
  onRespondToInvitation,
}) {
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [responding, setResponding] = useState(null);
  const [resolvingInvitation, setResolvingInvitation] = useState(false);
  const [invitationLookupError, setInvitationLookupError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [resolvedResponseStatus, setResolvedResponseStatus] = useState(null);
  const [
    loadSession,
    { data: sessionData, loading: loadingSession, error: sessionError },
  ] = useLazyQuery(GET_SESSION_BY_ID, {
    fetchPolicy: "network-only",
    context: {
      uri: API_CONFIG.SESSION_SERVICE,
    },
  });
  const [
    loadPendingInvitations,
    { data: pendingData, loading: loadingPendingInvitations, error: pendingError },
  ] = useLazyQuery(GET_PENDING_INVITATIONS, {
    fetchPolicy: "network-only",
    context: {
      uri: API_CONFIG.SESSION_SERVICE,
    },
  });
  const [
    loadAcceptedMembers,
    { loading: loadingAcceptedMembers, error: acceptedMembersError },
  ] = useLazyQuery(GET_SESSION_ACCEPTED_MEMBERS, {
    fetchPolicy: "network-only",
    context: {
      uri: API_CONFIG.SESSION_SERVICE,
    },
  });
  const [loadUpcomingSessions] = useLazyQuery(GET_UPCOMING_SESSIONS, {
    fetchPolicy: "network-only",
    context: {
      uri: API_CONFIG.SESSION_SERVICE,
    },
  });
  const [loadPastSessions] = useLazyQuery(GET_PAST_SESSIONS, {
    fetchPolicy: "network-only",
    context: {
      uri: API_CONFIG.SESSION_SERVICE,
    },
  });

  const isSessionInvitation = notification.type === "SESSION_INVITATION_RECEIVED";
  const invitationResponseStatus = getInvitationResponseStatus(notification.message);
  const effectiveResponseStatus = resolvedResponseStatus || invitationResponseStatus;
  const loadedPendingSessions = pendingData?.getPendingInvitations || [];
  const availablePendingSessions =
    Array.isArray(notification.pendingSessions) && notification.pendingSessions.length > 0
      ? notification.pendingSessions
      : loadedPendingSessions;
  const fallbackSession =
    findMatchingPendingSession(notification, availablePendingSessions);
  const sessionDetails = selectedSession || sessionData?.sessionById || fallbackSession;

  const resolveSessionId = async () => {
    const existingSessionId = getSessionIdFromNotification(
      notification,
      availablePendingSessions
    );

    if (existingSessionId) {
      const pendingSession = findMatchingPendingSession(
        notification,
        availablePendingSessions
      );
      if (pendingSession) {
        setSelectedSession(pendingSession);
      }
      return existingSessionId;
    }

    const userId = notification.userId || currentUserId || localStorage.getItem("username");
    if (!userId) {
      return null;
    }

    const result = await loadPendingInvitations({
      variables: { userId },
    });
    const pendingSessions = result.data?.getPendingInvitations || [];
    const pendingSession = findMatchingPendingSession(notification, pendingSessions);
    if (pendingSession) {
      setSelectedSession(pendingSession);
    }

    const pendingSessionId = getSessionIdFromNotification(notification, pendingSessions);
    if (pendingSessionId) {
      return pendingSessionId;
    }

    const [upcomingResult, pastResult] = await Promise.all([
      loadUpcomingSessions({ variables: { userId } }),
      loadPastSessions({ variables: { userId } }),
    ]);
    const matchedSession = findMatchingSession(notification, [
      ...(upcomingResult.data?.upcomingSessions || []),
      ...(pastResult.data?.pastSessions || []),
    ]);

    if (matchedSession) {
      setSelectedSession(matchedSession);
      return matchedSession.id || matchedSession.sessionId;
    }

    return null;
  };

  const determineInvitationResponseStatus = async (sessionId) => {
    const userId = notification.userId || currentUserId || localStorage.getItem("username");
    if (!sessionId || !userId) {
      return null;
    }

    const pendingResult = await loadPendingInvitations({
      variables: { userId },
    });
    const isStillPending = (pendingResult.data?.getPendingInvitations || []).some(
      (session) => session.id === sessionId || session.sessionId === sessionId
    );

    if (isStillPending) {
      return null;
    }

    const acceptedResult = await loadAcceptedMembers({
      variables: { sessionId },
    });
    const isAccepted = (acceptedResult.data?.getSessionAcceptedMembers || []).some(
      (member) => member.userId === userId
    );

    return isAccepted ? "ACCEPTED" : "REJECTED";
  };

  const handleClick = async () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (isSessionInvitation) {
      setShowInvitationModal(true);
      setInvitationLookupError("");
      setSelectedSession(null);
      setResolvedResponseStatus(null);
      setResolvingInvitation(true);

      try {
        const sessionId = await resolveSessionId();
        if (!sessionId) {
          setInvitationLookupError(
            invitationResponseStatus
              ? "The saved session details were not found for this response."
              : "No pending session invitation was found for this notification."
          );
          return;
        }

        const result = await loadSession({ variables: { id: sessionId } });
        const session = result.data?.sessionById;

        if (session) {
          setSelectedSession(session);
        } else if (!fallbackSession) {
          setInvitationLookupError(
            invitationResponseStatus
              ? "The saved session details were not found for this response."
              : "The session linked to this invitation was not found."
          );
        }

        const responseStatus = await determineInvitationResponseStatus(sessionId);
        setResolvedResponseStatus(responseStatus);
      } catch (err) {
        setInvitationLookupError(
          err.message || "Failed to load session details."
        );
      } finally {
        setResolvingInvitation(false);
      }

      return;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (confirmed) {
      onDelete(notification.id);
    }
  };

  const handleResponse = async (status) => {
    if (effectiveResponseStatus) {
      return;
    }

    setResponding(status);

    try {
      const sessionId = await resolveSessionId();

      console.debug("NotificationItem: attempting respond", {
        notificationId: notification.id,
        type: notification.type,
        sessionId,
        status,
        message: notification.message,
        pendingSessions: availablePendingSessions,
      });

      if (!sessionId) {
        alert("Error: Session ID not found in notification. See console for details.");
        return;
      }

      const resp = await onRespondToInvitation({
        sessionId,
        status,
        notificationId: notification.id,
        notificationMessage: notification.message,
      });
      console.debug("NotificationItem: respondToInvitation succeeded", { resp });
      setResolvedResponseStatus(status);
      setShowInvitationModal(false);
    } catch (err) {
      console.error("NotificationItem: respondToInvitation failed", {
        error: err,
        notificationId: notification.id,
        status,
      });
      throw err;
    } finally {
      setResponding(null);
    }
  };

  let displayMessage = notification.message.replace(
    /\[SESSION_ID:[a-zA-Z0-9_-]+\]\s*/,
    ""
  );
  displayMessage = displayMessage
    .replace(/\s*\[INVITATION_RESPONSE:(ACCEPTED|REJECTED)\]\s*/g, " ")
    .replace(
      /(^|\s)([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(\s|$)/,
      " "
    )
    .trim();

  return (
    <>
      <div
        className={`notification-item ${
          notification.isRead ? "read" : "unread"
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="notification-icon">{getIcon(notification.type)}</div>

        <p className="notification-message">{displayMessage}</p>

        {effectiveResponseStatus && (
          <span
            className={`notification-response-badge ${effectiveResponseStatus.toLowerCase()}`}
          >
            {effectiveResponseStatus === "ACCEPTED" ? "Accepted" : "Rejected"}
          </span>
        )}

        <span className="notification-time">
          {getRelativeTime(notification.createdAt)}
        </span>

        <div className="notification-actions-container">
          <button
            className="notification-delete-btn"
            type="button"
            onClick={handleDelete}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {showInvitationModal && (
        <div
          className="session-invitation-modal-backdrop"
          onClick={() => setShowInvitationModal(false)}
        >
          <div
            className="session-invitation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`session-invitation-title-${notification.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="session-invitation-close-btn"
              type="button"
              aria-label="Close session invitation"
              onClick={() => setShowInvitationModal(false)}
            >
              x
            </button>

            <h2 id={`session-invitation-title-${notification.id}`}>
              Session invitation
            </h2>

            {(resolvingInvitation ||
              loadingSession ||
              loadingPendingInvitations ||
              loadingAcceptedMembers) && (
              <p className="session-invitation-status">Loading session details...</p>
            )}

            {(invitationLookupError || sessionError || pendingError || acceptedMembersError) && (
              <p className="session-invitation-error">
                {invitationLookupError ||
                  sessionError?.message ||
                  pendingError?.message ||
                  acceptedMembersError?.message ||
                  "Failed to load session details."}
              </p>
            )}

            {!resolvingInvitation &&
              !loadingSession &&
              !loadingPendingInvitations &&
              !loadingAcceptedMembers &&
              !invitationLookupError &&
              !sessionError &&
              !pendingError &&
              !acceptedMembersError &&
              sessionDetails && (
              <div className="session-invitation-details">
                <div>
                  <span>Topic</span>
                  <strong>{sessionDetails.topic}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{sessionDetails.sessionType}</strong>
                </div>
                <div>
                  <span>Date and time</span>
                  <strong>{formatDateTime(sessionDetails.dateTime)}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{sessionDetails.durationMins} minutes</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{sessionDetails.location || "Online"}</strong>
                </div>
                <div>
                  <span>Host</span>
                  <strong>{sessionDetails.creatorId}</strong>
                </div>
                {sessionDetails.contactInfo && (
                  <div>
                    <span>Contact</span>
                    <strong>{sessionDetails.contactInfo}</strong>
                  </div>
                )}
              </div>
            )}

            {!resolvingInvitation &&
              !loadingSession &&
              !loadingPendingInvitations &&
              !loadingAcceptedMembers &&
              !invitationLookupError &&
              !sessionError &&
              !pendingError &&
              !acceptedMembersError &&
              !sessionDetails && (
              <p className="session-invitation-error">
                Session details were not found for this invitation.
              </p>
            )}

            <div className="session-invitation-actions">
              {effectiveResponseStatus ? (
                <span
                  className={`notification-response-badge ${effectiveResponseStatus.toLowerCase()}`}
                >
                  {effectiveResponseStatus === "ACCEPTED" ? "Accepted" : "Rejected"}
                </span>
              ) : (
                <>
                  <button
                    className="notification-accept-btn"
                    type="button"
                    onClick={() => handleResponse("ACCEPTED")}
                    disabled={responding !== null}
                  >
                    {responding === "ACCEPTED" ? "..." : "Accept"}
                  </button>
                  <button
                    className="notification-reject-btn"
                    type="button"
                    onClick={() => handleResponse("REJECTED")}
                    disabled={responding !== null}
                  >
                    {responding === "REJECTED" ? "..." : "Reject"}
                  </button>
                </>
              )}
              <button
                className="notification-delete-btn"
                type="button"
                onClick={handleDelete}
              >
                x
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
