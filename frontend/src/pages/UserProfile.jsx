import { useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { profileClient } from "../main";
import "./UserProfile.css";

const GET_PROFILE = gql`
  query GetProfile($userId: String!) {
    getProfile(userId: $userId) {
      id
      userId
      major
      academicYear
      bio
      courses {
        id
        name
      }
      topics {
        id
        name
      }
      preferences {
        pace
        mode
        groupSize
        style
      }
    }
  }
`;

export default function UserProfile() {
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId") || "";
  const userName = localStorage.getItem("userName") || "User";
  const userEmail = localStorage.getItem("userEmail") || "";

  const { data, loading, error } = useQuery(GET_PROFILE, {
    client: profileClient,
    variables: { userId },
    skip: !userId, // don't run if no userId
  });

  const profile = data?.getProfile;

  if (loading) return <div className="up-loading">Loading profile...</div>;
  if (error) return <div className="up-loading">Error: {error.message}</div>;

  return (
    <div className="up-wrapper">
      <nav className="up-navbar">
        <div className="up-nav-logo"><span className="up-logo-icon">👑</span></div>
        <div className="up-nav-links">
          <a href="/home">Home</a>
          <a href="/find-buddy">Find Buddy</a>
          <a href="/sessions">Sessions</a>
          <a href="/about">About Us</a>
        </div>
        <div className="up-nav-right">
          <span className="up-greeting">Hi, {userName}</span>
          <button className="up-icon-btn" title="Profile" onClick={() => navigate("/profile")}>👤</button>
          <button className="up-icon-btn" title="Notifications" onClick={() => navigate("/notifications")}>🔔</button>
        </div>
      </nav>

      <div className="up-page">
        {/* Header card */}
        <div className="up-header-card">
          <div className="up-header-left">
            <div className="up-avatar">
              <span>{userName?.[0]?.toUpperCase() || "?"}</span>
            </div>
            <div className="up-header-info">
              <h1 className="up-name">{userName}'s Profile</h1>
              <p className="up-email">{userEmail}</p>
            </div>
          </div>
          <div className="up-header-actions">
            <button className="up-action-btn" onClick={() => navigate("/sessions")}>
              View My Sessions
            </button>
            <button className="up-action-btn" onClick={() => navigate("/availability")}>
              My Availabilities
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="up-details-section">
          <h2 className="up-section-title">Personal details</h2>

          <div className="up-cards-row">
            {/* Academic info */}
            <div className="up-detail-card">
              <p className="up-detail-item">
                <span className="up-detail-icon">🏛</span>
                <strong>Major:</strong>&nbsp;{profile?.major || "—"}
              </p>
              <p className="up-detail-item">
                <span className="up-detail-icon">🎓</span>
                <strong>Year:</strong>&nbsp;{profile?.academicYear || "—"}
              </p>
              <p className="up-detail-item up-courses-label">
                <span className="up-detail-icon">📚</span>
                <strong>Courses:</strong>
              </p>
              <ul className="up-courses-list">
                {(profile?.courses || []).map((c) => <li key={c.id}>{c.name}</li>)}
              </ul>
            </div>

            {/* Preferences */}
            <div className="up-detail-card">
              <p className="up-pref-title">
                <span className="up-detail-icon">👍</span>
                <strong>Preferences:</strong>
              </p>
              <ul className="up-pref-list">
                {profile?.preferences?.pace && <li>Pace: {profile.preferences.pace}</li>}
                {profile?.preferences?.mode && <li>Mode: {profile.preferences.mode}</li>}
                {profile?.preferences?.groupSize && <li>Group size: {profile.preferences.groupSize}</li>}
                {profile?.preferences?.style && <li>{profile.preferences.style}</li>}
                {!profile?.preferences && <li>No preferences set yet.</li>}
              </ul>
            </div>

            {/* Bio + Topics */}
            <div className="up-detail-card">
              <p className="up-bio-title">
                <span className="up-detail-icon">≡</span>
                <strong>Bio</strong>
              </p>
              <p className="up-bio-text">{profile?.bio || "No bio yet."}</p>

              {profile?.topics?.length > 0 && (
                <>
                  <p className="up-bio-title" style={{ marginTop: "1rem" }}>
                    <span className="up-detail-icon">📝</span>
                    <strong>Study Topics</strong>
                  </p>
                  <ul className="up-courses-list">
                    {profile.topics.map((t) => <li key={t.id}>{t.name}</li>)}
                  </ul>
                </>
              )}
            </div>
          </div>

          <button className="up-edit-btn" onClick={() => navigate("/profile-setup")}>
            ✏ Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}