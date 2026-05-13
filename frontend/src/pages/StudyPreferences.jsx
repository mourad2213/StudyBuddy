import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
//import { profileClient } from "../main";
import "./StudyPreferences.css";

const paceOptions = ["Slow", "Medium", "Fast"];
const modeOptions = ["Online", "In-person"];
const styleOptions = [
  "Writing",
  "Listening",
  "Quiet study",
  "Discussion",
  "Others",
];

const SET_PREFERENCE = gql`
  mutation SetPreference(
    $profileId: String!
    $pace: String
    $mode: String
    $groupSize: Int
    $style: String
  ) {
    setPreference(
      profileId: $profileId
      pace: $pace
      mode: $mode
      groupSize: $groupSize
      style: $style
    ) {
      id
      pace
      mode
      groupSize
      style
    }
  }
`;

export default function StudyPreferences() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pace: "",
    mode: "",
    groupSize: "",
    styles: [],
  });
  const [paceOpen, setPaceOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [error, setError] = useState("");

  const [setPreference, { loading }] = useMutation(SET_PREFERENCE);


  const toggleStyle = (style) => {
    setForm((prev) => ({
      ...prev,
      styles: prev.styles.includes(style)
        ? prev.styles.filter((s) => s !== style)
        : [...prev.styles, style],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const profileId = localStorage.getItem("profileId");
      if (!profileId) {
        setError("Profile not found. Please complete Profile Setup first.");
        return;
      }

      await setPreference({
        variables: {
          profileId,
          pace: form.pace,
          mode: form.mode,
          groupSize: form.groupSize ? parseInt(form.groupSize) : null,
          style: form.styles.join(", "),
        },
      });

      // Mark full onboarding as done
      localStorage.setItem("onboardingDone", "true");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="sp-body">
      <div className="sp-image-panel">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
          alt="Students studying together"
          className="sp-bg-image"
        />
      </div>

      <div className="sp-form-panel">
        <h1 className="sp-title">Study Preferences</h1>
        <div className="sp-card">
          <p className="sp-card-subtitle">Setup your study preferences</p>
          {error && <p className="sp-error">{error}</p>}

          <form onSubmit={handleSave} className="sp-form">
            <div className="sp-field">
              <label>Preferred Pace</label>
              <div className="sp-dropdown-wrapper">
                <button
                  type="button"
                  className="sp-dropdown-btn"
                  onClick={() => {
                    setPaceOpen(!paceOpen);
                    setModeOpen(false);
                    setStyleOpen(false);
                  }}
                >
                  <span style={{ color: form.pace ? "#555" : "#aaa" }}>
                    {form.pace || "Choose your Preferred Pace"}
                  </span>
                  <span className="sp-arrow">▾</span>
                </button>
                {paceOpen && (
                  <ul className="sp-dropdown-list">
                    {paceOptions.map((o) => (
                      <li
                        key={o}
                        onClick={() => {
                          setForm({ ...form, pace: o });
                          setPaceOpen(false);
                        }}
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="sp-field">
              <label>Study Mode</label>
              <div className="sp-dropdown-wrapper">
                <button
                  type="button"
                  className="sp-dropdown-btn"
                  onClick={() => {
                    setModeOpen(!modeOpen);
                    setPaceOpen(false);
                    setStyleOpen(false);
                  }}
                >
                  <span style={{ color: form.mode ? "#555" : "#aaa" }}>
                    {form.mode || "Choose your Study Mode"}
                  </span>
                  <span className="sp-arrow">▾</span>
                </button>
                {modeOpen && (
                  <ul className="sp-dropdown-list">
                    {modeOptions.map((o) => (
                      <li
                        key={o}
                        onClick={() => {
                          setForm({ ...form, mode: o });
                          setModeOpen(false);
                        }}
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="sp-field">
              <label>Group Size</label>
              <input
                type="number"
                placeholder="Enter preferred group size (e.g. 3)"
                value={form.groupSize}
                min="1"
                max="20"
                onChange={(e) =>
                  setForm({ ...form, groupSize: e.target.value })
                }
              />
            </div>

            <div className="sp-field">
              <label>Study Style</label>
              <div className="sp-dropdown-wrapper">
                <button
                  type="button"
                  className="sp-dropdown-btn"
                  onClick={() => {
                    setStyleOpen(!styleOpen);
                    setPaceOpen(false);
                    setModeOpen(false);
                  }}
                >
                  <span style={{ color: form.styles.length ? "#555" : "#aaa" }}>
                    {form.styles.length
                      ? form.styles.join(", ")
                      : "Choose one or more study style"}
                  </span>
                  <span className="sp-arrow">▾</span>
                </button>
                {styleOpen && (
                  <ul className="sp-dropdown-list">
                    {styleOptions.map((o) => (
                      <li
                        key={o}
                        className={form.styles.includes(o) ? "sp-selected" : ""}
                        onClick={() => {
                          toggleStyle(o);
                          setStyleOpen(false);
                        }}
                      >
                        <span className="sp-check">
                          {form.styles.includes(o) ? "✓ " : ""}
                        </span>
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button type="submit" className="sp-save-btn" disabled={loading}>
              {loading ? "Saving..." : "Finish Setup ✓"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
