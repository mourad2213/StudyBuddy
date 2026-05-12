import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ACCEPT_BUDDY_REQUEST,
  GET_CONNECTIONS,
  GET_INCOMING_BUDDY_REQUESTS,
  GET_OUTGOING_BUDDY_REQUESTS,
  REJECT_BUDDY_REQUEST,
} from "../graphql/queries/buddyRequests";
import { GET_ALL_USERS } from "../graphql/queries/user";
import { GET_ALL_PROFILES } from "../graphql/queries/profiles";
import "./FriendRequests.css";

const MATCHING_GRAPHQL = "http://localhost:4003/graphql";
const PROFILE_GRAPHQL = "http://localhost:4006/graphql";

const TABS = [
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent Requests" },
  { id: "connections", label: "Connections" },
];

const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Connected",
  rejected: "Declined",
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export default function FriendRequests() {
  const [activeTab, setActiveTab] = useState("requests");
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState("");
  const userId = localStorage.getItem("userId");

  const {
    data: incomingData,
    loading: incomingLoading,
    error: incomingError,
    refetch: refetchIncoming,
  } = useQuery(GET_INCOMING_BUDDY_REQUESTS, {
    variables: { userId: userId || "" },
    skip: !userId,
    context: { uri: MATCHING_GRAPHQL },
  });

  const {
    data: outgoingData,
    loading: outgoingLoading,
    error: outgoingError,
    refetch: refetchOutgoing,
  } = useQuery(GET_OUTGOING_BUDDY_REQUESTS, {
    variables: { userId: userId || "" },
    skip: !userId,
    context: { uri: MATCHING_GRAPHQL },
  });

  const {
    data: connectionsData,
    loading: connectionsLoading,
    error: connectionsError,
    refetch: refetchConnections,
  } = useQuery(GET_CONNECTIONS, {
    variables: { userId: userId || "" },
    skip: !userId,
    context: { uri: MATCHING_GRAPHQL },
  });

  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useQuery(GET_ALL_USERS, {
    skip: !userId,
  });

  const {
    data: profilesData,
    loading: profilesLoading,
    error: profilesError,
  } = useQuery(GET_ALL_PROFILES, {
    skip: !userId,
    context: { uri: PROFILE_GRAPHQL },
  });

  const [acceptBuddyRequest] = useMutation(ACCEPT_BUDDY_REQUEST, {
    context: { uri: MATCHING_GRAPHQL },
  });
  const [rejectBuddyRequest] = useMutation(REJECT_BUDDY_REQUEST, {
    context: { uri: MATCHING_GRAPHQL },
  });

  const requestGroups = useMemo(() => {
    const users = usersData?.getAllUsers || [];
    const profiles = profilesData?.getAllProfiles || [];
    const incomingRequests = incomingData?.getIncomingBuddyRequests || [];
    const outgoingRequests = outgoingData?.getOutgoingBuddyRequests || [];
    const connections = connectionsData?.getConnections || [];

    const usersById = new Map(users.map((user) => [user.id, user]));
    const profilesByUserId = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );

    const mapRequest = (request, otherUserId) => {
      const user = usersById.get(otherUserId);
      const profile = profilesByUserId.get(otherUserId);
      const statusKey = (request.status || "PENDING").toLowerCase();

      return {
        id: request.id,
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        status: statusKey,
        name: user?.name || "Unknown",
        major: profile?.major || "Major not set",
        academicYear: profile?.academicYear || "Year not set",
      };
    };

    return {
      incoming: incomingRequests.map((request) =>
        mapRequest(request, request.fromUserId),
      ),
      outgoing: outgoingRequests.map((request) =>
        mapRequest(request, request.toUserId),
      ),
      connections: connections.map((request) =>
        mapRequest(
          request,
          request.fromUserId === userId ? request.toUserId : request.fromUserId,
        ),
      ),
    };
  }, [
    incomingData,
    outgoingData,
    connectionsData,
    usersData,
    profilesData,
    userId,
  ]);

  const visibleRequests =
    activeTab === "requests"
      ? requestGroups.incoming
      : activeTab === "sent"
        ? requestGroups.outgoing
        : requestGroups.connections;

  const isLoading =
    incomingLoading ||
    outgoingLoading ||
    connectionsLoading ||
    usersLoading ||
    profilesLoading;
  const hasError =
    incomingError ||
    outgoingError ||
    connectionsError ||
    usersError ||
    profilesError;

  const handleAccept = async (request) => {
    if (!userId) return;
    setActionError("");
    setActioningId(request.id);
    try {
      await acceptBuddyRequest({
        variables: {
          fromUserId: request.fromUserId,
          toUserId: request.toUserId,
        },
      });
      await refetchIncoming();
      await refetchOutgoing();
      await refetchConnections();
    } catch (error) {
      setActionError("Unable to accept this request right now.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (request) => {
    if (!userId) return;
    setActionError("");
    setActioningId(request.id);
    try {
      await rejectBuddyRequest({
        variables: {
          fromUserId: request.fromUserId,
          toUserId: request.toUserId,
        },
      });
      await refetchIncoming();
      await refetchOutgoing();
      await refetchConnections();
    } catch (error) {
      setActionError("Unable to reject this request right now.");
    } finally {
      setActioningId(null);
    }
  };

  if (!userId) {
    return (
      <div className="requests-page">
        <div className="requests-shell">
          <div className="requests-header-container">
            <h1 className="requests-title">
              <span className="requests-title-icon">👥</span> Study Buddy
              Requests
            </h1>
            <p className="requests-subtitle">
              Log in to view your buddy requests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="requests-page">
      <div className="requests-shell">
        <div className="requests-header-container">
          <h1 className="requests-title">
            <span className="requests-title-icon">👥</span> Study Buddy Requests
          </h1>
          <p className="requests-subtitle">
            Manage your study buddy connections
          </p>
        </div>

        <div className="requests-card">
          <div className="requests-controls">
            <div className="requests-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`requests-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="requests-search">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search....." />
            </div>
          </div>

          <div className="requests-table-head">
            <span>Student</span>
            <span>Major</span>
            <span>Availability</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {isLoading ? (
            <p className="requests-empty">Loading requests...</p>
          ) : hasError ? (
            <p className="requests-empty">Unable to load requests right now.</p>
          ) : visibleRequests.length === 0 ? (
            <p className="requests-empty">No requests to show.</p>
          ) : (
            visibleRequests.map((request) => (
              <div key={request.id} className="requests-row">
                <div className="requests-student">
                  <div className="requests-avatar">
                    <img
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${request.name}`}
                      alt="avatar"
                    />
                  </div>
                  <div>
                    <div className="requests-name">{request.name}</div>
                  </div>
                </div>
                <div className="requests-major">{request.major}</div>
                <div className="requests-availability">
                  {request.academicYear !== "Year not set"
                    ? request.academicYear
                    : "Flexible"}
                </div>
                <div className={`requests-status-col ${request.status}`}>
                  {STATUS_LABELS[request.status]}
                </div>
                <div className="requests-actions">
                  {activeTab === "requests" && request.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        className="requests-btn reject"
                        onClick={() => handleReject(request)}
                        disabled={actioningId === request.id}
                      >
                        Reject connection
                      </button>
                      <button
                        type="button"
                        className="requests-btn accept"
                        onClick={() => handleAccept(request)}
                        disabled={actioningId === request.id}
                      >
                        Accept connection
                      </button>
                    </>
                  ) : (
                    <span className="requests-muted">No action</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {actionError && <p className="requests-error">{actionError}</p>}
      </div>
    </div>
  );
}
