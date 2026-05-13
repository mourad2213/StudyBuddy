import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import API_CONFIG from "../config/api";
import BuddyCard from "../components/BuddyCard";
import { GET_RECOMMENDATIONS } from "../graphql/queries/matching";
import {
  CREATE_BUDDY_REQUEST,
  GENERATE_RECOMMENDATIONS,
} from "../graphql/mutations/matching";
import { GET_ALL_PROFILES } from "../graphql/queries/profiles";
import { GET_ALL_USERS } from "../graphql/queries/user";

const MATCHING_GRAPHQL = API_CONFIG.MATCHING_SERVICE;
const PROFILE_GRAPHQL = API_CONFIG.PROFILE_SERVICE;
const USER_GRAPHQL = API_CONFIG.USER_SERVICE;

const fallbackAvatars = [
  "/avatar-tala.svg",
  "/avatar-fadi.svg",
  "/avatar-sofyan.svg",
];

const SEARCH_CATEGORY_OPTIONS = [
  { value: "all", label: "All recommendation signals" },
  { value: "courses", label: "Courses" },
  { value: "topics", label: "Topics" },
  { value: "availability", label: "Availability" },
  { value: "preferences", label: "Study preferences" },
  { value: "studyStyle", label: "Study style" },
];

const REASON_TYPE_TO_CATEGORY = {
  SHARED_COURSES: "courses",
  SHARED_TOPICS: "topics",
  AVAILABILITY: "availability",
  PREFERENCES: "preferences",
  STUDY_STYLE: "studyStyle",
};

const normalizeFilterValue = (value) =>
  (value ?? "").toString().trim().toLowerCase();

export default function Recommendations() {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [majorFilter, setMajorFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    data: recommendationsData,
    loading: recommendationsLoading,
    error: recommendationsError,
    refetch,
  } = useQuery(GET_RECOMMENDATIONS, {
    variables: {
      userId: currentUserId,
      limit: 20,
    },
    skip: !currentUserId,
    fetchPolicy: "cache-and-network",
    context: {
      uri: MATCHING_GRAPHQL,
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });

  const {
    data: profilesData,
    loading: profilesLoading,
    error: profilesError,
  } = useQuery(GET_ALL_PROFILES, {
    fetchPolicy: "cache-and-network",
    context: {
      uri: PROFILE_GRAPHQL,
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });
  const {
      data: usersData,
      loading: usersLoading,
      error: usersError,
    } = useQuery(GET_ALL_USERS, {
      fetchPolicy: "cache-and-network",
      context: {
        uri: USER_GRAPHQL,
        headers: {
          authorization: token ? `Bearer ${token}` : "",
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    });

  const [createBuddyRequest, { loading: sendingRequest }] = useMutation(
    CREATE_BUDDY_REQUEST,
    {
      context: {
        uri: MATCHING_GRAPHQL,
        headers: {
          authorization: token ? `Bearer ${token}` : "",
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    }
  );

  const [generateRecommendations] = useMutation(GENERATE_RECOMMENDATIONS, {
    context: {
      uri: MATCHING_GRAPHQL,
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let isActive = true;

    const loadRecommendations = async () => {
      try {
        console.log(`[Frontend] Starting recommendation generation for user: ${currentUserId}`);
        setIsGenerating(true);
        
        const result = await generateRecommendations({
          variables: {
            userId: currentUserId,
            limit: 20,
          },
        });
        
        console.log(`[Frontend] Generation result:`, {
          success: !!result.data,
          mutations: result.data?.generateRecommendations?.length || 0,
        });

        if (isActive) {
          console.log(`[Frontend] Refetching recommendations...`);
          const refetchResult = await refetch();
          console.log(`[Frontend] Refetch returned ${refetchResult.data?.getRecommendations?.length || 0} recommendations`);
        }
      } catch (error) {
        console.error("[Frontend] Error generating recommendations:", error);
        console.error("[Frontend] Error details:", {
          message: error.message,
          graphQLErrors: error.graphQLErrors?.map(e => e.message),
          networkError: error.networkError?.message,
        });
      } finally {
        if (isActive) {
          setIsGenerating(false);
        }
      }
    };

    loadRecommendations();

    return () => {
      isActive = false;
    };
  }, [currentUserId, generateRecommendations, refetch]);

  const recommendations = recommendationsData?.getRecommendations || [];
  const profiles = profilesData?.getAllProfiles || [];
  const users = usersData?.getAllUsers || [];
  const enrichedRecommendations = useMemo(() => {
    return recommendations
      .map((recommendation) => ({
        ...recommendation,
        matchedUserId:
          recommendation.userId === currentUserId
            ? recommendation.candidateId
            : recommendation.userId,
      }))
      .filter((recommendation) => recommendation.matchedUserId !== currentUserId)
      .map((recommendation, index) => {
      const realProfile = profiles.find(
        (profile) => profile.userId === recommendation.matchedUserId
      );

      const realUser = users.find(
        (user) => user.id === recommendation.matchedUserId
      );

      const courses =
        realProfile?.courses?.map((course) => course.name).join(", ") ||
        "No courses added";

      return {
        ...recommendation,
        profile: {
          name: realUser?.name || "Study Buddy",
          email: realUser?.email || "",
          university: realUser?.university || "",
          major: realProfile?.major || "Not specified",
          year: realProfile?.academicYear || realUser?.year || "Not specified",
          courses,
          studyStyle: realProfile?.preferences?.style || "Not specified",
          avatarSrc: fallbackAvatars[index % fallbackAvatars.length],
        },
      };
    });
  }, [currentUserId, recommendations, profiles, users]);

  const availableMajors = useMemo(() => {
    return [...new Set(
      enrichedRecommendations
        .map((recommendation) => recommendation.profile?.major)
        .filter((major) => major && major !== "Not specified")
    )].sort((left, right) => left.localeCompare(right));
  }, [enrichedRecommendations]);

  const availableYears = useMemo(() => {
    return [...new Set(
      enrichedRecommendations
        .map((recommendation) => recommendation.profile?.year)
        .filter((year) => year && year !== "Not specified")
    )].sort((left, right) => left.localeCompare(right));
  }, [enrichedRecommendations]);

  const filteredRecommendations = useMemo(() => {
    const normalizedSearch = normalizeFilterValue(searchTerm);
    const normalizedMajorFilter = normalizeFilterValue(majorFilter);
    const normalizedYearFilter = normalizeFilterValue(yearFilter);

    let result = enrichedRecommendations.filter((recommendation) => {
      const profile = recommendation.profile;

      const reasonText = recommendation.reasons
        .map((reason) => `${reason.type} ${reason.description}`.toLowerCase())
        .join(" ");

      const searchableText = [
        profile.name,
        profile.major,
        profile.year,
        profile.studyStyle,
        profile.courses,
        reasonText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const categoryReasonMatch =
        searchCategory === "all"
          ? true
          : recommendation.reasons.some(
              (reason) =>
                REASON_TYPE_TO_CATEGORY[reason.type] === searchCategory
            );

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      const matchesMajor = normalizedMajorFilter
        ? normalizeFilterValue(profile.major) === normalizedMajorFilter
        : true;
      const matchesYear = normalizedYearFilter
        ? normalizeFilterValue(profile.year) === normalizedYearFilter
        : true;

      return matchesSearch && matchesMajor && matchesYear && categoryReasonMatch;
    });

    if (sortBy === "score") {
      result = [...result].sort((a, b) => b.score - a.score);
    }

    return result;
  }, [
    enrichedRecommendations,
    searchTerm,
    searchCategory,
    majorFilter,
    yearFilter,
    sortBy,
  ]);

  const handleConnect = async (candidateId) => {
    setMessage("");

    try {
      await createBuddyRequest({
        variables: {
          fromUserId: currentUserId,
          toUserId: candidateId,
        },
      });

      setMessage("Buddy request sent successfully!");
      await refetch();
      navigate(`/match/${candidateId}`);
    } catch (err) {
      setMessage(err.message || "Failed to send buddy request.");
    }
  };

  if (!currentUserId) {
    return (
      <main className="find-buddy-page">
        <p className="find-buddy-error">You must be logged in first.</p>
      </main>
    );
  }

  if (recommendationsLoading || profilesLoading || usersLoading || isGenerating) {
    return (
      <main className="find-buddy-page">
        <p className="find-buddy-loading">Loading recommendations...</p>
      </main>
    );
  }

  if (recommendationsError || profilesError || usersError) {
    return (
      <main className="find-buddy-page">
        <p className="find-buddy-error">
          {recommendationsError?.message || profilesError?.message || usersError?.message}
        </p>
      </main>
    );
  }

  return (
    <main className="find-buddy-page">
      <section className="find-buddy-header">
        <img
          src="/personIcon.png"
          alt="Person Icon"
          className="find-buddy-header-icon"
        />
        <h1>Find Your buddies !</h1>
      </section>

      <section className="find-buddy-layout">
        <section className="find-buddy-results-panel">
          {message && <p className="find-buddy-message">{message}</p>}

          {filteredRecommendations.length === 0 ? (
            <p className="find-buddy-empty">
              No recommendations found yet. Update your profile and availability
              to improve matching.
            </p>
          ) : (
            <div className="find-buddy-grid">
              {filteredRecommendations.map((recommendation) => {
                const profile = recommendation.profile;

                const firstReason =
                  recommendation.reasons?.[0]?.description ||
                  "Recommended based on compatibility.";

                return (
                  <BuddyCard
                    key={recommendation.id}
                    name={profile.name}
                    major={profile.major}
                    year={profile.year}
                    studyStyle={profile.studyStyle}
                    courses={profile.courses}
                    avatarSrc={profile.avatarSrc}
                    avatarAlt={profile.name}
                    score={recommendation.score}
                    reason={firstReason}
                    onViewProfile={() => setSelectedBuddy(recommendation)}
                    onConnect={() =>
                      handleConnect(recommendation.matchedUserId)
                    }
                    connectLabel={sendingRequest ? "Sending..." : "Send Request"}
                  />
                );
              })}
            </div>
          )}
        </section>

        <aside className="find-buddy-filter-panel">
          <h2>Refine your search</h2>

          <input
            type="text"
            className="find-buddy-search-input"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          >
            {SEARCH_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={majorFilter}
            onChange={(e) => setMajorFilter(e.target.value)}
          >
            <option value="">Major</option>
            {availableMajors.map((major) => (
              <option key={major} value={major}>
                {major}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">Academic year</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="score">Highest compatibility</option>
          </select>

          <p>Click “View Profile” to see why this buddy was recommended.</p>
        </aside>
      </section>

      {selectedBuddy && (
        <div className="find-buddy-modal-backdrop">
          <div className="find-buddy-modal">
            <button
              className="find-buddy-modal-close"
              onClick={() => setSelectedBuddy(null)}
            >
              ×
            </button>

            <h2>{selectedBuddy.profile.name}</h2>

            <p>
              <strong>Compatibility:</strong> {selectedBuddy.score}%
            </p>

            <p>
              <strong>Major:</strong> {selectedBuddy.profile.major}
            </p>

            <p>
              <strong>Academic Year:</strong> {selectedBuddy.profile.year}
            </p>

            <p>
              <strong>Study Style:</strong> {selectedBuddy.profile.studyStyle}
            </p>

            <p>
              <strong>Courses:</strong> {selectedBuddy.profile.courses}
            </p>

            <h3>Why this match?</h3>

            {selectedBuddy.reasons.length === 0 ? (
              <p>No match reasons available.</p>
            ) : (
              <ul>
                {selectedBuddy.reasons.map((reason, index) => (
                  <li key={index}>{reason.description}</li>
                ))}
              </ul>
            )}

            <button
              className="find-buddy-connect-btn"
              onClick={() => handleConnect(selectedBuddy.matchedUserId)}
              disabled={sendingRequest}
            >
              {sendingRequest ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
