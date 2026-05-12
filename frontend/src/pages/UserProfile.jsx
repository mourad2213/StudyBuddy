import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
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
      courses { id name }
      topics { id name }
      preferences { pace mode groupSize style }
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($userId: String!, $major: String, $academicYear: String, $bio: String) {
    updateProfile(userId: $userId, major: $major, academicYear: $academicYear, bio: $bio) {
      id
      major
      academicYear
      bio
    }
  }
`;

const UPDATE_PREFERENCE = gql`
  mutation UpdatePreference($profileId: String!, $pace: String, $mode: String, $groupSize: Int, $style: String) {
    updatePreference(profileId: $profileId, pace: $pace, mode: $mode, groupSize: $groupSize, style: $style) {
      id
      pace
      mode
      groupSize
      style
    }
  }
`;

const academicYears = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7"];
const paceOptions = ["Slow", "Medium", "Fast"];
const modeOptions = ["Online", "In-person"];
const styleOptions = ["Writing", "Listening", "Quiet study", "Discussion", "Others"];

export default function UserProfile() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") || "";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";
  const userEmail = localStorage.getItem("userEmail") || localStorage.getItem("email") || "";

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [paceOpen, setPaceOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_PROFILE, {
    client: profileClient,
    variables: { userId },
    skip: !userId,
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE, { client: profileClient });
  const [updatePreference] = useMutation(UPDATE_PREFERENCE, { client: profileClient });

  const profile = data?.getProfile;

  const startEditing = () => {
    // Pre-fill edit form with current data
    setEditForm({
      major: profile?.major || "",
      academicYear: profile?.academicYear || "",
      bio: profile?.bio || "",
      pace: profile?.preferences?.pace || "",
      mode: profile?.preferences?.mode || "",
      groupSize: profile?.preferences?.groupSize?.toString() || "",
      styles: profile?.preferences?.style
        ? profile.preferences.style.split(", ").filter(Boolean)
        : [],
    });
    setSaveError("");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await updateProfile({
        variables: {
          userId,
          major: editForm.major,
          academicYear: editForm.academicYear,
          bio: editForm.bio,
        },
      });

      if (profile?.id) {
        await updatePreference({
          variables: {
            profileId: profile.id,
            pace: editForm.pace,
            mode: editForm.mode,
            groupSize: editForm.groupSize ? parseInt(editForm.groupSize) : null,
            style: editForm.styles.join(", "),
          },
        });
      }

      await refetch();
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStyle = (style) => {
    setEditForm((prev) => ({
      ...prev,
      styles: prev.styles.includes(style)
        ? prev.styles.filter((s) => s !== style)
        : [...prev.styles, style],
    }));
  };

  if (loading) return <div className="up-loading">Loading profile...</div>;
  if (error) return <div className="up-loading">Error: {error.message}</div>;

  return (
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

      {/* Details section */}
      <div className="up-details-section">
        <h2 className="up-section-title">Personal details</h2>

        {!editing ? (
          /* ── VIEW MODE ── */
          <>
            <div className="up-cards-row">
              <div className="up-detail-card">
                <p className="up-detail-item"><span className="up-detail-icon">🏛</span><strong>Major:</strong>&nbsp;{profile?.major || "—"}</p>
                <p className="up-detail-item"><span className="up-detail-icon">🎓</span><strong>Year:</strong>&nbsp;{profile?.academicYear || "—"}</p>
                <p className="up-detail-item"><span className="up-detail-icon">📚</span><strong>Courses:</strong></p>
                <ul className="up-courses-list">
                  {(profile?.courses || []).map((c) => <li key={c.id}>{c.name}</li>)}
                </ul>
              </div>

              <div className="up-detail-card">
                <p className="up-pref-title"><span className="up-detail-icon">👍</span><strong>Preferences:</strong></p>
                <ul className="up-pref-list">
                  {profile?.preferences?.pace && <li>Pace: {profile.preferences.pace}</li>}
                  {profile?.preferences?.mode && <li>Mode: {profile.preferences.mode}</li>}
                  {profile?.preferences?.groupSize && <li>Group size: {profile.preferences.groupSize}</li>}
                  {profile?.preferences?.style && <li>{profile.preferences.style}</li>}
                  {!profile?.preferences && <li>No preferences set yet.</li>}
                </ul>
              </div>

              <div className="up-detail-card">
                <p className="up-bio-title"><span className="up-detail-icon">≡</span><strong>Bio</strong></p>
                <p className="up-bio-text">{profile?.bio || "No bio yet."}</p>
                {profile?.topics?.length > 0 && (
                  <>
                    <p className="up-bio-title" style={{ marginTop: "1rem" }}>
                      <span className="up-detail-icon">📝</span><strong>Study Topics</strong>
                    </p>
                    <ul className="up-courses-list">
                      {profile.topics.map((t) => <li key={t.id}>{t.name}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <button className="up-edit-btn" onClick={startEditing}>✏ Edit Profile</button>
          </>
        ) : (
          /* ── EDIT MODE ── */
          <div className="up-edit-form">
            {saveError && <p className="up-error">{saveError}</p>}

            <div className="up-edit-grid">
              {/* Major */}
              <div className="up-edit-field">
                <label>Major</label>
                <input type="text" value={editForm.major}
                  onChange={(e) => setEditForm({ ...editForm, major: e.target.value })} />
              </div>

              {/* Academic Year */}
              <div className="up-edit-field">
                <label>Academic Year</label>
                <div className="up-dropdown-wrapper">
                  <button type="button" className="up-dropdown-btn" onClick={() => setYearOpen(!yearOpen)}>
                    <span>{editForm.academicYear || "Choose year"}</span>
                    <span>▾</span>
                  </button>
                  {yearOpen && (
                    <ul className="up-dropdown-list">
                      {academicYears.map((y) => (
                        <li key={y} onClick={() => { setEditForm({ ...editForm, academicYear: y }); setYearOpen(false); }}>{y}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Pace */}
              <div className="up-edit-field">
                <label>Study Pace</label>
                <div className="up-dropdown-wrapper">
                  <button type="button" className="up-dropdown-btn" onClick={() => setPaceOpen(!paceOpen)}>
                    <span>{editForm.pace || "Choose pace"}</span><span>▾</span>
                  </button>
                  {paceOpen && (
                    <ul className="up-dropdown-list">
                      {paceOptions.map((o) => (
                        <li key={o} onClick={() => { setEditForm({ ...editForm, pace: o }); setPaceOpen(false); }}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Mode */}
              <div className="up-edit-field">
                <label>Study Mode</label>
                <div className="up-dropdown-wrapper">
                  <button type="button" className="up-dropdown-btn" onClick={() => setModeOpen(!modeOpen)}>
                    <span>{editForm.mode || "Choose mode"}</span><span>▾</span>
                  </button>
                  {modeOpen && (
                    <ul className="up-dropdown-list">
                      {modeOptions.map((o) => (
                        <li key={o} onClick={() => { setEditForm({ ...editForm, mode: o }); setModeOpen(false); }}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Group Size */}
              <div className="up-edit-field">
                <label>Group Size</label>
                <input type="number" min="1" max="20" value={editForm.groupSize}
                  onChange={(e) => setEditForm({ ...editForm, groupSize: e.target.value })} />
              </div>

              {/* Study Style */}
              <div className="up-edit-field">
                <label>Study Style</label>
                <div className="up-dropdown-wrapper">
                  <button type="button" className="up-dropdown-btn" onClick={() => setStyleOpen(!styleOpen)}>
                    <span>{editForm.styles.length ? editForm.styles.join(", ") : "Choose style"}</span><span>▾</span>
                  </button>
                  {styleOpen && (
                    <ul className="up-dropdown-list">
                      {styleOptions.map((o) => (
                        <li key={o} className={editForm.styles.includes(o) ? "up-selected" : ""}
                          onClick={() => toggleStyle(o)}>
                          {editForm.styles.includes(o) ? "✓ " : ""}{o}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Bio - full width */}
            <div className="up-edit-field up-bio-field">
              <label>Bio</label>
              <textarea
                rows={4}
                placeholder="Tell others about yourself..."
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>

            <div className="up-edit-actions">
              <button className="up-save-btn" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button className="up-cancel-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}