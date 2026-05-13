import React from "react";
import "./Buddycard.css";

const BuddyCard = ({
  name,
  major,
  year,
  studyStyle,
  courses,
  avatarSrc,
  avatarAlt,
  onConnect,
}) => {
  const displayCourses = Array.isArray(courses)
    ? courses.filter(Boolean).join(", ")
    : courses;
  const safeAvatar = avatarSrc || "/avatar-fadi.svg";
  const safeAlt = avatarAlt || "Student avatar";

  return (
    <div className="buddy-card">
      <div className="buddy-card-avatar-row">
        <img src={safeAvatar} alt={safeAlt} className="buddy-card-avatar" />
        <span className="buddy-card-name">{name || "User"}</span>
      </div>

      <div className="buddy-card-info">
        <p>
          <span className="buddy-card-label">Major:</span>{" "}
          {major || "Not set"}
        </p>
        <p>
          <span className="buddy-card-label">Year:</span>{" "}
          {year || "Not set"}
        </p>
        <p>
          <span className="buddy-card-label">Study Style:</span>{" "}
          {studyStyle || "Not set"}
        </p>
        <p>
          <span className="buddy-card-label">Courses:</span>{" "}
          <span className="buddy-card-courses">
            {displayCourses || "No courses listed"}
          </span>
        </p>
      </div>

      <button
        className="buddy-card-connect-btn"
        onClick={(e) => {
          e.preventDefault();
          onConnect && onConnect();
        }}
      >
        Connect
      </button>
    </div>
  );
};

export default BuddyCard;
