import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { profileClient } from "../main";
import "./ProfileSetup.css";

const academicYears = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
];

const CREATE_PROFILE = gql`
  mutation CreateProfile(
    $userId: String!
    $major: String
    $academicYear: String
    $bio: String
  ) {
    createProfile(
      userId: $userId
      major: $major
      academicYear: $academicYear
      bio: $bio
    ) {
      id
      userId
      major
      academicYear
    }
  }
`;

const ADD_COURSE = gql`
  mutation AddCourse($profileId: String!, $name: String!) {
    addCourse(profileId: $profileId, name: $name) {
      id
      name
    }
  }
`;

const ADD_TOPIC = gql`
  mutation AddTopic($profileId: String!, $name: String!) {
    addTopic(profileId: $profileId, name: $name) {
      id
      name
    }
  }
`;

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    major: "",
    academicYear: "",
    courses: "",
    studyTopics: "",
  });
  const [yearOpen, setYearOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [createProfile] = useMutation(CREATE_PROFILE, {
    client: profileClient,
  });
  const [addCourse] = useMutation(ADD_COURSE, { client: profileClient });
  const [addTopic] = useMutation(ADD_TOPIC, { client: profileClient });

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("You must be logged in first.");
        setLoading(false);
        return;
      }

      // Create profile
      const { data } = await createProfile({
        variables: {
          userId,
          major: form.major,
          academicYear: form.academicYear,
          bio: "",
        },
      });

      const profileId = data.createProfile.id;
      localStorage.setItem("profileId", profileId);

      // Add courses one by one
      const courseList = form.courses
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      for (const name of courseList) {
        await addCourse({ variables: { profileId, name } });
      }

      // Add topics one by one
      const topicList = form.studyTopics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      for (const name of topicList) {
        await addTopic({ variables: { profileId, name } });
      }

      // Mark onboarding step 1 done
      localStorage.setItem("profileSetupDone", "true");

      navigate("/study-preferences");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-body">
      <div className="ps-image-panel">
        <img
          src="https://images.unsplash.com/photo-1484807352052-23338990c6c6?w=800&q=80"
          alt="Study desk"
          className="ps-bg-image"
        />
      </div>

      <div className="ps-form-panel">
        <h1 className="ps-title">Profile Setup</h1>
        <div className="ps-card">
          <p className="ps-card-subtitle">Setup your profile</p>
          {error && <p className="ps-error">{error}</p>}

          <form onSubmit={handleSave} className="ps-form">
            <div className="ps-field">
              <label>Major</label>
              <input
                type="text"
                placeholder="Enter your Major"
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
                required
              />
            </div>

            <div className="ps-field">
              <label>Academic Year</label>
              <div className="ps-dropdown-wrapper">
                <button
                  type="button"
                  className="ps-dropdown-btn"
                  onClick={() => setYearOpen(!yearOpen)}
                >
                  <span style={{ color: form.academicYear ? "#555" : "#aaa" }}>
                    {form.academicYear || "Choose your Academic Year"}
                  </span>
                  <span className="ps-arrow">▾</span>
                </button>
                {yearOpen && (
                  <ul className="ps-dropdown-list">
                    {academicYears.map((y) => (
                      <li
                        key={y}
                        onClick={() => {
                          setForm({ ...form, academicYear: y });
                          setYearOpen(false);
                        }}
                      >
                        {y}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="ps-field">
              <label>Courses</label>
              <input
                type="text"
                placeholder="Enter your courses (comma separated, e.g. Math, Physics)"
                value={form.courses}
                onChange={(e) => setForm({ ...form, courses: e.target.value })}
              />
            </div>

            <div className="ps-field">
              <label>Study Topics</label>
              <input
                type="text"
                placeholder="Enter your study topics (comma separated)"
                value={form.studyTopics}
                onChange={(e) =>
                  setForm({ ...form, studyTopics: e.target.value })
                }
              />
            </div>

            <button type="submit" className="ps-save-btn" disabled={loading}>
              {loading ? "Saving..." : "Save & Continue →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
