import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { Bell, CalendarDays, MessageSquare, Users, Plus, Mail, MapPin, Monitor } from "lucide-react";
import BuddyCard from "../components/BuddyCard";
import API_CONFIG from "../config/api";
import { GET_ALL_USERS } from "../graphql/queries/user";
import { GET_ALL_PROFILES, GET_PROFILE } from "../graphql/queries/profiles";
import { GET_UPCOMING_SESSIONS } from "../graphql/queries";
import { GET_NOTIFICATIONS } from "../graphql/queries/notifications";
import { CREATE_BUDDY_REQUEST } from "../graphql/queries/buddyRequests";
import { GET_RECOMMENDATIONS } from "../graphql/queries/matching";
import "./Dashboard.css";

const AVATAR_POOL = [
  "/avatar-fadi.svg",
  "/avatar-sofyan.svg",
  "/avatar-tala.svg",
];

function getCurrentUserId() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  return localStorage.getItem("userId") || storedUser?.id || "";
}


function getCurrentUserName() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  return storedUser?.name || storedUser?.username || "StudyBuddy";
}

function formatDateTime(dateTimeString) {
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
}

function getRelativeTime(createdAt) {
  if (!createdAt) return "just now";
  
  const date = new Date(Number(createdAt));  // ← Number() converts the string to ms timestamp
  if (isNaN(date.getTime())) return "just now";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}


export default function Dashboard() {

  const currentUserId = getCurrentUserId();
  const currentUserName = getCurrentUserName();
  const sessionUserId = currentUserId;  // used for sessions query
  const navigate = useNavigate();              // ← now correctly inside the component
  const token = localStorage.getItem("token");

  const {
    data: recommendationsData,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useQuery(GET_RECOMMENDATIONS, {          // ← also correctly inside the component
    variables: { userId: currentUserId, limit: 3 },
    skip: !currentUserId,
    fetchPolicy: "cache-and-network",
    context: {
      uri: API_CONFIG.MATCHING_SERVICE,
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });

  // function getCurrentUserName() {
  //   const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  //   return storedUser?.name || storedUser?.username || "";
  // }
  

  // const { data: profileData, loading: profileLoading, error: profileError } = useQuery(GET_PROFILE, {
  //   skip: !currentUserId,
  //   variables: { userId: currentUserId },
  //   fetchPolicy: "cache-and-network",
  // });

  const { data: usersData, loading: usersLoading, error: usersError } = useQuery(GET_ALL_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const { data: profilesData, loading: profilesLoading, error: profilesError } = useQuery(GET_ALL_PROFILES, {
    fetchPolicy: "cache-and-network",
  });

  const { data: upcomingData, loading: upcomingLoading, error: upcomingError } = useQuery(GET_UPCOMING_SESSIONS, {
    skip: !sessionUserId,
    variables: { userId: sessionUserId },
    fetchPolicy: "cache-and-network",
  });

  const { data: notificationsData, loading: notificationsLoading } = useQuery(GET_NOTIFICATIONS, {
    skip: !currentUserId,
    variables: { userId: currentUserId },
    fetchPolicy: "cache-and-network",
  });

  const [createBuddyRequest] = useMutation(CREATE_BUDDY_REQUEST);

  
  //const currentProfile = profileData?.getProfile;
  const recommendedLoading = recommendationsLoading || usersLoading || profilesLoading;
  const recommendedError = recommendationsError || usersError || profilesError;
  const notifications = notificationsData?.getNotifications || [];
  const userNameById = new Map((usersData?.getAllUsers || []).map((user) => [user.id, user.name]));


  const upcomingSessions = (upcomingData?.upcomingSessions || []).map((session) => {
    const acceptedParticipants =
      session.participants?.filter((p) => p.inviteStatus === "ACCEPTED") || [];
    const peer = acceptedParticipants.find((p) => p.userId !== session.creatorId);
    const dateTime = formatDateTime(session.dateTime);
    const peerName = peer
      ? userNameById.get(peer.userId) || peer.userId
      : "You";
    return {
      id: session.id,
      topic: session.topic,
      duration: session.durationMins,
      location: session.location || (session.sessionType === "ONLINE" ? "Online" : "TBD"),
      isOnline: session.sessionType === "ONLINE",
      peerName,
      date: dateTime.date,
      time: dateTime.time,
    };
  });

  const recommendations = recommendationsData?.getRecommendations || [];

  const recommendedBuddies = useMemo(() => {
    if (!usersData?.getAllUsers || !profilesData?.getAllProfiles) return [];

    return recommendations.map((rec, index) => {
      const profile = profilesData.getAllProfiles.find(
        (p) => p.userId === rec.candidateId
      );
      const user = usersData.getAllUsers.find(
        (u) => u.id === rec.candidateId
      );

      return {
        score: rec.score,
        id: rec.candidateId,
        userId: rec.candidateId,
        name: user?.name || "Study Buddy",
        major: profile?.major || "Unknown",
        year: profile?.academicYear || "N/A",
        studyStyle: profile?.preferences?.style || "Flexible",
        courses: profile?.courses?.map((c) => c.name) || [],
        avatarSrc: AVATAR_POOL[index % AVATAR_POOL.length],
        avatarAlt: `${user?.name || "Study Buddy"} avatar`,
      };
    }).slice(0, 3);
  }, [recommendations, usersData, profilesData]);

  const notificationsSorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const recentNotifications = notificationsSorted.slice(0, 1);
  const oldNotifications = notificationsSorted.slice(1);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleConnect = (buddy) => {
    if (!currentUserId) return;
    createBuddyRequest({
      variables: { fromUserId: currentUserId, toUserId: buddy.userId },
    })
      .then(() => {
        navigate(`/match/${buddy.userId}`);
      })
      .catch(console.error);
  };

  if (!currentUserId) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-not-logged-in">
          <h2>Please log in to view your dashboard.</h2>
          <Link to="/login" className="dashboard-login-link">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Welcome Header */}
      <div className="dashboard-welcome-card">
        <h1>Welcome back, {currentUserName}!</h1>
      </div>

      <div className="dashboard-grid">
        {/* ── LEFT COLUMN ── */}
        <div className="dashboard-main">

          {/* Recommended Buddies */}
          <section className="dashboard-section dashboard-recommended">
            <div className="section-heading">
              <h2>Recommended study buddies:</h2>
              <Link to="/find-buddy" className="section-action">view all →</Link>
            </div>

            {recommendedLoading ? (
              <p className="dashboard-loading">Loading recommendations...</p>
            ) : recommendedError ? (
              <p className="dashboard-error">Unable to load recommendations right now.</p>
            ) : recommendedBuddies.length === 0 ? (
              <p className="dashboard-empty">No recommended buddies found yet.</p>
            ) : (
              <div className="recommended-grid">
                {recommendedBuddies.map((buddy) => (
                  <Link key={buddy.id} to="/find-buddy" className="recommended-card-link">
                    <BuddyCard
                      name={buddy.name}
                      major={buddy.major}
                      year={buddy.year}
                      studyStyle={buddy.studyStyle}
                      courses={buddy.courses}
                      avatarSrc={buddy.avatarSrc}
                      avatarAlt={buddy.avatarAlt}
                      onConnect={() => handleConnect(buddy)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Sessions + Quick Actions row */}
          <div className="dashboard-bottom-row">
            <section className="dashboard-section dashboard-sessions">
              <div className="section-heading">
                <h2>Upcoming study sessions:</h2>
                <Link to="/sessions" className="section-action">view all →</Link>
              </div>

              {upcomingError ? (
                <p className="dashboard-error">Unable to load upcoming sessions.</p>
              ) : upcomingLoading ? (
                <p className="dashboard-loading">Loading sessions...</p>
              ) : upcomingSessions.length === 0 ? (
                <div className="session-empty">
                  <p>No upcoming sessions yet.</p>
                  <Link to="/create-session" className="dashboard-button">Create your first session</Link>
                </div>
              ) : (
                <div className="minisessions-grid">
                  {upcomingSessions.slice(0, 4).map((session) => (
                    <div key={session.id} className="session-card">
                      <div className="session-card-top">
                        <span className="session-topic">{session.topic}</span>
                        <span className="session-duration-badge">{session.duration} min</span>
                      </div>
                      <div className="session-card-meta">
                        <span className="session-location-icon">
                          {session.isOnline ? <Monitor size={13} /> : <MapPin size={13} />}
                          {session.isOnline ? "Online" : session.location}
                        </span>
                        <span>{session.date}</span>
                        <span>{session.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="dashboard-card quick-actions-card">
              <div className="section-heading">
                <h2>Quick Actions</h2>
              </div>
              <nav className="quick-actions-list">
                <Link to="/create-session" className="action-link">
                  <CalendarDays size={15} />
                  Create Study Session
                </Link>
                <Link to="/chat" className="action-link">
                  <MessageSquare size={15} />
                  Messages
                </Link>
                <Link to="/friends" className="action-link">
                  <Users size={15} />
                  Study Buddy connections
                </Link>
              </nav>
            </section>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Notifications ── */}
        <aside className="dashboard-side">
          <section className="dashboard-card notifications-card">
            <div className="section-heading">
              <h2>Recent Notifications:</h2>
            </div>

            {notificationsLoading ? (
              <p className="dashboard-loading">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="dashboard-empty">No notifications yet.</p>
            ) : (
              <>
                <div className="notification-list">
                  {recentNotifications.map((notification) => (
                    <div key={notification.id} className="notification-item">
                      <span className="notification-icon"><Mail size={16} /></span>
                      <div className="notification-body">
                        <span className="notification-message">{notification.message}</span>
                        <span className="notification-time">{getRelativeTime(notification.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {oldNotifications.length > 0 && (
                  <div className="notification-old-block">
                    <h3>old:</h3>
                    {oldNotifications.slice(0, 6).map((notification) => (
                      <div key={notification.id} className="notification-old-item">
                        <span className="notification-icon-sm"><Mail size={14} /></span>
                        <div className="notification-body">
                          <span className="notification-message-sm">{notification.message}</span>
                          <span className="notification-time">{getRelativeTime(notification.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <Link to="/notifications" className="dashboard-button secondary">
              View All
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}