import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { GET_ALL_USERS } from "../graphql/queries/user";
import { GET_PROFILE } from "../graphql/queries/profiles";
import { CREATE_CONVERSATION } from "../graphql/mutations";
import { CREATE_BUDDY_REQUEST } from "../graphql/queries/buddyRequests";
import "./MatchDetailsPage.css";

const PROFILE_GRAPHQL = "http://localhost:4006/graphql";
const MATCHING_GRAPHQL = "http://localhost:4003/graphql";
const MESSAGING_GRAPHQL = "http://localhost:4008/graphql";
const AVATAR_POOL = [
  "/avatar-fadi.svg",
  "/avatar-sofyan.svg",
  "/avatar-tala.svg",
];

export default function MatchDetailsPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [requestSent, setRequestSent] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState("");
  const loginBubbleRef = useRef(null);
  const currentUserId = localStorage.getItem("userId");

  const isLoggedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    if (!loginPrompt) {
      return;
    }

    const handleClickOutside = (event) => {
      if (
        loginBubbleRef.current &&
        !loginBubbleRef.current.contains(event.target)
      ) {
        setLoginPrompt("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [loginPrompt]);

  const [createBuddyRequest, { loading: creatingRequest }] = useMutation(
    CREATE_BUDDY_REQUEST,
    {
      context: { uri: MATCHING_GRAPHQL },
    },
  );

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
  } = useQuery(GET_PROFILE, {
    variables: { userId: userId || "" },
    skip: !userId,
    context: { uri: PROFILE_GRAPHQL },
  });

  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useQuery(GET_ALL_USERS);

  const profile = profileData?.getProfile;

  const user = useMemo(() => {
    const users = usersData?.getAllUsers || [];
    return users.find((entry) => entry.id === userId) || null;
  }, [usersData, userId]);

  const courses = profile?.courses?.map((course) => course.name) || [];
  const preferences = [
    { label: "Pace", value: profile?.preferences?.pace },
    { label: "Mode", value: profile?.preferences?.mode },
    { label: "Group size", value: profile?.preferences?.groupSize },
    { label: "Study style", value: profile?.preferences?.style },
  ].filter((item) => item.value);

  const isLoading = profileLoading || usersLoading;
  const hasError = profileError || usersError;

  const connectLabel = requestSent
    ? "Request sent"
    : creatingRequest
      ? "Sending..."
      : "Connect";

  const handleConnect = () => {
    if (!isLoggedIn || !currentUserId) {
      setLoginPrompt("Log in and start your study journey");
      return;
    }

    createBuddyRequest({
      variables: { fromUserId: currentUserId, toUserId: userId || "" },
    })
      .then(() => {
        setRequestSent(true);
      })
      .catch(() => {
        setLoginPrompt("Unable to send request right now.");
      });
  };

  const handleMessage = () => {
    if (!isLoggedIn) {
      setLoginPrompt("Log in and start your study journey");
      return;
    }
    // Determine a usable username for the current user (mirror ChatApp logic)
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    let currentUsername = localStorage.getItem("username");
    if (!currentUsername) {
      currentUsername =
        storedUser.loginUsername || storedUser.actual_username || storedUser.username || "";
    }

    if (!currentUsername) {
      // Fallback: try to find a non-system key in localStorage
      const systemKeys = new Set(["token", "userId", "user", "cart", "favoriteColor"]);
      const possible = Object.keys(localStorage).find(
        (k) => !systemKeys.has(k) && k !== localStorage.getItem("userId")
      );
      currentUsername = possible || "";
    }

    const otherUsername = user?.name || "";
      
    if (!currentUsername || !otherUsername) {
      setLoginPrompt("Unable to start chat right now.");
      
      return;
    }

    createConversation({
      variables: { participant1Id: currentUsername, participant2Id: otherUsername },
    })
      .then(() => {
        navigate("/chat");
      })
      .catch((err) => {
        const errorMessage =
          err?.graphQLErrors?.[0]?.message || err?.message || "";

        if (errorMessage === "Users must be matched before creating a conversation") {
          alert("You must be matched before creating a conversation");
          return;
        }

        alert("Unable to start chat right now.");
      });
  };

  const [createConversation, { loading: creatingConversation }] = useMutation(
    CREATE_CONVERSATION,
    { context: { uri: MESSAGING_GRAPHQL } },
  );

  if (isLoading) {
    return (
      <div className="match-details-page">
        <div className="match-details-shell">
          <p>Loading match details...</p>
        </div>
      </div>
    );
  }

  if (hasError || !profile || !user) {
    return (
      <div className="match-details-page">
        <div className="match-details-shell">
          <p>Unable to load match details right now.</p>
          <button className="match-back-button" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-details-page">
      <div className="match-details-shell">
        <section className="match-hero">
          <div className="match-hero-left">
            <div className="match-avatar">
              <img
                src={AVATAR_POOL[0]}
                alt={`${user.name} avatar`}
                className="match-avatar-img"
              />
            </div>
            <div className="match-hero-text">
              <h1>{user.name}'s Profile</h1>
              <p className="match-subtitle">
                {profile.major || "Major not set"}
                {profile.academicYear ? ` · Year ${profile.academicYear}` : ""}
              </p>
            </div>
          </div>

          <div className="match-hero-actions-container">
            <div className="match-hero-actions">
              <button
                className="match-action-button"
                onClick={handleMessage}
                type="button"
                disabled={creatingConversation}
              >
                {creatingConversation ? "Starting..." : "Message"}
              </button>
              <button
                className="match-action-button outline"
                onClick={handleConnect}
                type="button"
                disabled={requestSent || creatingRequest}
              >
                {connectLabel}
              </button>
            </div>
            {loginPrompt && (
              <div className="login-bubble-popup" ref={loginBubbleRef}>
                <p>{loginPrompt}</p>
                <div className="login-bubble-actions">
                  <button
                    onClick={() => navigate("/login")}
                    className="login-bubble-btn primary"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setLoginPrompt("")}
                    className="login-bubble-btn secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="match-details-card">
          <h2>Personal details</h2>
          <div className="match-details-grid">
            <div className="match-info-card">
              <h3>Academics</h3>
              <p>
                <strong>Major:</strong> {profile.major || "Not set"}
              </p>
              <p>
                <strong>Year:</strong> {profile.academicYear || "Not set"}
              </p>
              <div>
                <strong>Courses:</strong>
                {courses.length === 0 ? (
                  <p className="match-muted">No courses listed.</p>
                ) : (
                  <ul>
                    {courses.map((course) => (
                      <li key={course}>{course}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="match-info-card">
              <h3>Preferences</h3>
              {preferences.length === 0 ? (
                <p className="match-muted">No preferences yet.</p>
              ) : (
                <ul>
                  {preferences.map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}:</strong> {item.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="match-info-card">
              <h3>Bio</h3>
              <p>{profile.bio || "No bio shared yet."}</p>
            </div>
          </div>
        </section>

        <button className="match-back-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    </div>
  );
}
