import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_STUDY_SESSION } from "../graphql/mutations";
import { GET_UPCOMING_SESSIONS } from "../graphql/queries";
import "./CreateSession.css";

export default function CreateSession() {
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
  const matchingServiceUrl =
    import.meta.env.VITE_MATCHING_SERVICE_URL ||
    "http://localhost:4003/graphql";
  const userServiceUrl =
    import.meta.env.VITE_USER_SERVICE_URL ||
    "http://localhost:4001/graphql";

  const [formData, setFormData] = useState({
    topic: "",
    sessionType: "Online",
    room: "",
    duration: 45,
    selectedBuddies: [],
    date: "",
    time: "",
  });

  const [recommendedBuddies, setRecommendedBuddies] = useState([]);

  useEffect(() => {
    if (!userName) {
      setRecommendedBuddies([]);
      return;
    }

    let isActive = true;

    const loadRecommendations = async () => {
      try {
        const response = await fetch(matchingServiceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query GetRecommendations($userId: ID!, $limit: Int) {
              getRecommendations(userId: $userId, limit: $limit) {
                userId
                candidateId
                score
              }
            }`,
            variables: { userId: userName, limit: 10 },
          }),
        });

        const result = await response.json();

        // If recommendations API works, use those results
        if (result.data?.getRecommendations && !result.errors) {
          const recommendations = result.data.getRecommendations;
          const mapped = recommendations.map((rec) => ({
            userId: rec.userId,
            candidateId: rec.candidateId,
            // Show the OTHER person (whoever is not the current user)
            name: rec.userId === userName ? rec.candidateId : rec.userId,
            avatar: "👤",
            score: rec.score,
            availability: `Recommended match • score ${rec.score}`,
          }));
          if (isActive) {
            setRecommendedBuddies(mapped);
          }
          return;
        }

        // If matching service has errors, log them but continue
        if (result.errors) {
          console.warn("Matching service error:", result.errors[0]?.message);
        }

        // Fallback: show message that matching service is unavailable
        console.log("Matching service unavailable. Using offline buddy list.");
        
        // Show empty state message - user can still create session
        if (isActive) {
          setRecommendedBuddies([]);
        }
      } catch (error) {
        console.error("Error loading recommendations:", error);
        if (isActive) {
          setRecommendedBuddies([]);
        }
      }
    };

    loadRecommendations();

    return () => {
      isActive = false;
    };
  }, [matchingServiceUrl, userName]);

  const buddyList = recommendedBuddies;

  const [createSession, { loading: creating }] = useMutation(
    CREATE_STUDY_SESSION,
    {
      refetchQueries: [
        { query: GET_UPCOMING_SESSIONS, variables: { userId: userName } },
      ],
    }
  );

  const today = new Date();
  const [calView, setCalView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const firstDayOfMonth = new Date(calView.year, calView.month, 1).getDay();
  const daysInMonth = new Date(calView.year, calView.month + 1, 0).getDate();

  const handlePrevMonth = () => setCalView(prev => {
    const m = prev.month === 0 ? 11 : prev.month - 1;
    const y = prev.month === 0 ? prev.year - 1 : prev.year;
    return { year: y, month: m };
  });

  const handleNextMonth = () => setCalView(prev => {
    const m = prev.month === 11 ? 0 : prev.month + 1;
    const y = prev.month === 11 ? prev.year + 1 : prev.year;
    return { year: y, month: m };
  });

  const [isBuddyDropdownOpen, setIsBuddyDropdownOpen] = useState(false);

  const getBuddyKey = (buddy) =>
    (buddy?.candidateId ?? buddy?.id ?? buddy?.userId ?? buddy?.name ?? "").toString();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? Number(value) : value,
    }));
  };

  const handleSelectBuddy = (buddy) => {
    setFormData((prev) => {
      const buddyKey = getBuddyKey(buddy);
      const isSelected = prev.selectedBuddies.some(
        (b) => getBuddyKey(b) === buddyKey
      );
      return {
        ...prev,
        selectedBuddies: isSelected
          ? prev.selectedBuddies.filter((b) => getBuddyKey(b) !== buddyKey)
          : [...prev.selectedBuddies, buddy],
      };
    });
  };

  const handleClearBuddies = () => {
    setFormData((prev) => ({
      ...prev,
      selectedBuddies: [],
    }));
  };

  const isBuddySelected = (buddyId) => {
    return formData.selectedBuddies.some((b) => getBuddyKey(b) === buddyId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.topic || !formData.date || !formData.time) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.selectedBuddies.length === 0) {
      alert("Please select at least one buddy to study with");
      return;
    }

    try {
      const [year, month, day] = formData.date.split("-").map(Number);
      const [hours, minutes] = formData.time.split(":").map(Number);

      const selectedDateTime = new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0,
        0
      );

      if (Number.isNaN(selectedDateTime.getTime())) {
        throw new Error("Invalid date or time selected");
      }

      // Validate that the selected date/time is in the future
      const now = new Date();
      if (selectedDateTime <= now) {
        alert("Please select a date and time in the future");
        return;
      }

      const dateTime = selectedDateTime.toISOString();

      const sessionType =
        formData.sessionType === "Online" ? "ONLINE" : "OFFLINE";

      const input = {
        topic: formData.topic,
        sessionType,
        location: formData.sessionType === "In-person" ? formData.room : null,
        dateTime,
        durationMins: Number(formData.duration),
          creatorId: userName,
        contactInfo: "",
        possibleMemberIds: formData.selectedBuddies.map((b) =>
          (b.candidateId ?? b.userId ?? b.id).toString()
        ),
      };

      const response = await createSession({
        variables: { input },
      });

      if (response.data) {
        alert("Session created successfully!");
        setFormData({
          topic: "",
          sessionType: "Online",
          room: "",
          duration: 45,
          selectedBuddies: [],
          date: "",
          time: "",
        });
      }
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Failed to create session. Please try again.");
    }
  };

  return (
    <div className="create-session-page">
      <h1 className="page-title">Create Your Study Session</h1>

      <div className="create-session-card">
        <form onSubmit={handleCreate}>
          <div className="top-grid">

            {/* LEFT SIDE */}
            <div className="left-side">

              {/* Topic */}
              <div className="field full-width">
                <label>
                  Topic <span>*</span>
                </label>

                <input
                  type="text"
                  name="topic"
                  placeholder="Ex : Math | Quiz | Recap"
                  value={formData.topic}
                  onChange={handleInputChange}
                />
              </div>

              {/* Session Type */}
              <div className="field">
                <label>
                  Session Type <span>*</span>
                </label>

                <select
                  name="sessionType"
                  value={formData.sessionType}
                  onChange={handleInputChange}
                  className="session-type-select"
                >
                  <option>Online</option>
                  <option>In-person</option>
                </select>
              </div>

              {/* Room */}
              {formData.sessionType === "In-person" && (
                <div className="field">
                  <label>
                   Room <span>*</span>
                  </label> 

                  <input
                    type="text"
                    name="room"
                    placeholder="A110"
                    value={formData.room}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              {/* Duration */}
              <div className="field duration-field">
                <label>Duration <span>*</span></label>
                <select name="duration" value={formData.duration} onChange={handleInputChange}>
                  <option value={45}>45 Min</option>
                  <option value={60}>60 Min</option>
                  <option value={90}>90 Min</option>
                  <option value={120}>120 Min</option>
                </select>
              </div>

              {/* DATE + TIME */}
              <div className="field date-field full-width">
                <label>Session Date and Time <span>*</span></label>
                <div className="custom-calendar-card">

                  <div className="calendar-header">
                    <h3>{MONTHS[calView.month]} {calView.year}</h3>
                    <div className="calendar-nav">
                      <button type="button" onClick={handlePrevMonth}>‹</button>
                      <button type="button" onClick={handleNextMonth}>›</button>
                    </div>
                  </div>

                  <div className="weekdays">
                    <span>SUN</span><span>MON</span><span>TUE</span>
                    <span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                  </div>

                  <div className="calendar-grid">
                    {Array(firstDayOfMonth).fill("").concat(
                      Array.from({ length: daysInMonth }, (_, i) => i + 1)
                    ).map((day, index) => {
                      const isSelected = formData.date === `${calView.year}-${calView.month + 1}-${day}`;
                      return (
                        <button
                          type="button"
                          key={index}
                          className={`calendar-day${isSelected ? " active" : ""}`}
                          onClick={() => {
                            if (day !== "") {
                              setFormData(prev => ({
                                ...prev,
                                date: `${calView.year}-${calView.month + 1}-${day}`
                              }));
                            }
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="time-row">
                    <span>Time</span>
                    <div className="time-pill">
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="time-picker-input"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="right-side">
              <div className="field">
                <div className="field buddy-field"></div>
                <label>
                  Choose Your Buddy/Buddies <span>*</span>
                </label>

                <div className="buddy-box">
                  <button
                    type="button"
                    className="buddy-selected"
                    onClick={() =>
                      setIsBuddyDropdownOpen(!isBuddyDropdownOpen)
                    }
                  >
                    <div className="selected-buddies">
                      {formData.selectedBuddies.length > 0 ? (
                        <div className="buddy-tags">
                          {formData.selectedBuddies.map((buddy) => (
                              <span key={getBuddyKey(buddy)} className="buddy-tag">
                              {buddy.name}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectBuddy(buddy);
                                }}
                                className="tag-remove"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="placeholder">
                          Select buddies
                        </span>
                      )}
                    </div>

                    {formData.selectedBuddies.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearBuddies();
                        }}
                        className="clear-btn"
                        title="Clear all"
                      >
                        ×
                      </button>
                    )}
                  </button>

                  {isBuddyDropdownOpen && (
                    <div className="buddy-list">
                      {buddyList.map((buddy) => (
                        <button
                          type="button"
                          key={getBuddyKey(buddy)}
                          className={`buddy-item ${
                            isBuddySelected(getBuddyKey(buddy))
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => handleSelectBuddy(buddy)}
                        >
                          <div className="buddy-checkbox">
                            {isBuddySelected(getBuddyKey(buddy)) && <span>✓</span>}
                          </div>

                          <div className="buddy-avatar">
                            {buddy.avatar}
                          </div>

                          <div>
                            <h4>{buddy.name}</h4>
                            <p>{buddy.availability}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <div className="submit-wrapper">
            <button type="submit" className="create-btn" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}