import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  Monitor,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
} from "lucide-react";
import { GET_UPCOMING_SESSIONS, GET_PAST_SESSIONS } from "../graphql/queries";

import "./Sessions.css";

const SessionCard = ({ session }) => {
  return (
    <div className="session-card">
      <div className="session-header">
        <h3 className="session-topic">{session.topic}</h3>

        <div className="session-duration">
          <span>{session.duration}</span>
          <small>min</small>
        </div>
      </div>

      <div className="session-footer">
        <div className="participant-wrapper">
          <div className="participant-avatar">
            <User size={18} color="#fff" />
          </div>
          <span className="participant-name">{session.name}</span>
        </div>

        <div className="session-meta">
          <div className="meta-item">
            {session.isOnline ? (
              <Monitor size={14} />
            ) : (
              <MapPin size={14} />
            )}
            <span>{session.isOnline ? "Online" : session.location}</span>
          </div>

          <div className="meta-badge">{session.date}</div>
          <div className="meta-badge">{session.time}</div>
        </div>
      </div>
    </div>
  );
};

const SliderControls = () => (
  <div className="slider-controls">
    <ChevronLeft size={18} />
    <div className="slider-dots">
      <span className="dot active"></span>
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
    <ChevronRight size={18} />
  </div>
);
const SessionsColumn = ({ title, sessions, loading, error, emptyMessage }) => {
  const [page, setPage] = useState(0);

  const sessionsPerPage = 4;
  const totalPages = Math.ceil(sessions.length / sessionsPerPage);

  const startIndex = page * sessionsPerPage;
  const currentSessions = sessions.slice(
    startIndex,
    startIndex + sessionsPerPage
  );

  const handlePrev = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  return (
    <div className="sessions-section">
      <h2 className="section-title">{title}</h2>

      {error ? (
        <p className="error-message">
          Error loading sessions: {error.message}
        </p>
      ) : loading ? (
        <p>Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <>
          <div className="sessions-grid">
            {currentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="slider-controls">
              <ChevronLeft
                size={18}
                onClick={handlePrev}
                style={{
                  opacity: page === 0 ? 0.4 : 1,
                  cursor: page === 0 ? "default" : "pointer",
                }}
              />

              <div className="slider-dots">
                {[...Array(totalPages)].map((_, index) => (
                  <span
                    key={index}
                    className={`dot ${index === page ? "active" : ""}`}
                  ></span>
                ))}
              </div>

              <ChevronRight
                size={18}
                onClick={handleNext}
                style={{
                  opacity: page === totalPages - 1 ? 0.4 : 1,
                  cursor:
                    page === totalPages - 1 ? "default" : "pointer",
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default function Sessions() {
  // Resolve username the same way as CreateSession.jsx
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  let currentUserName = "Me";

  const directUsername = localStorage.getItem("username");
  if (directUsername) {
    currentUserName = directUsername;
  } else {
    currentUserName =
      storedUser.loginUsername ||
      storedUser.actual_username ||
      storedUser.username ||
      storedUser.name ||
      "Me";
  }

  if (currentUserName === "Me") {
    const systemKeys = new Set(["token", "userId", "user", "cart", "favoriteColor"]);
    const userIdUuid = localStorage.getItem("userId") || "";
    const possibleUsernameKey = Object.keys(localStorage).find(
      (key) => !systemKeys.has(key) && key !== userIdUuid && !key.match(/^[0-9a-f\-]{36}$/)
    );

    if (possibleUsernameKey) {
      currentUserName = possibleUsernameKey;
    }
  }

  const userName = currentUserName === "Me" ? "" : currentUserName;

  const { data: upcomingData, loading: upcomingLoading, error: upcomingError } = useQuery(
    GET_UPCOMING_SESSIONS,
    { variables: { userId: userName }, fetchPolicy: "cache-and-network" }
  );

  const { data: pastData, loading: pastLoading, error: pastError } = useQuery(
    GET_PAST_SESSIONS,
    { variables: { userId: userName }, fetchPolicy: "cache-and-network" }
  );

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const transformSessionData = (session) => {
    const acceptedMembers = session.participants?.filter(p => p.inviteStatus === "ACCEPTED") || [];
    const firstMember = acceptedMembers.find(p => p.userId !== session.creatorId);

    return {
      id: session.id,
      topic: session.topic,
      duration: session.durationMins,
      isOnline: session.sessionType === "ONLINE",
      location: session.location || "Online",
      name: firstMember ? firstMember.userId : "You",
      ...formatDateTime(session.dateTime),
    };
  };

  const upcomingSessions = upcomingData?.upcomingSessions?.map(
    transformSessionData
  ) || [];
  const pastSessions = pastData?.pastSessions?.map(transformSessionData) || [];

  return (
            <div className="sessions-container">
              <div className="sessions-header">
                <h1 className="sessions-title">
                  <span className="sessions-icon">
                    <Clock3 size={22} />
                  </span>
                  Sessions
                </h1>
              </div>

              <div className="sessions-content">
        <SessionsColumn
          title="Upcoming Sessions"
          sessions={upcomingSessions}
          loading={upcomingLoading}
          error={upcomingError}
          emptyMessage={
            <>
              No upcoming sessions.{" "}
              <Link to="/create-session">Create one</Link>
            </>
          }
        />

        <SessionsColumn
          title="Past Sessions"
          sessions={pastSessions}
          loading={pastLoading}
          error={pastError}
          emptyMessage="No past sessions."
        />

        <div className="sessions-actions">
          <Link to="/create-session" className="create-session-btn">
            <Plus size={20} />
            create new session
          </Link>
        </div>
      </div>
    </div>
  );
}