import React from "react";

const BuddyCard = ({
  name,
  major,
  year,
  studyStyle,
  courses,
  avatarSrc,
  avatarAlt,
}) => {
  const displayCourses = Array.isArray(courses)
    ? courses.filter(Boolean).join(", ")
    : courses;
  const safeAvatar = avatarSrc || "/avatar-fadi.svg";
  const safeAlt = avatarAlt || "Student avatar";

  return (
    <div className="thq-buddy-card-fadi-elm">
      <div className="thq-pfp-elm1">
        <img src={safeAvatar} alt={safeAlt} className="thq-ellipse2-elm" />
      </div>
      <span className="thq-text-elm21">{name || "User"}</span>
      <div className="thq-description-elm1">
        <span className="thq-text-elm22">
          <span className="thq-text-elm23">Major:</span>
          <span>{major || "Not set"}</span>
        </span>
        <span className="thq-text-elm25">Year: {year || "Not set"}</span>
        <span className="thq-text-elm26">
          <span className="thq-text-elm27">Study Style:</span>
          <span>{studyStyle || "Not set"}</span>
        </span>
        <span className="thq-text-elm29">
          <span className="thq-text-elm30">Courses:</span>
          <span>{displayCourses || "No courses listed"}</span>
        </span>
      </div>
    </div>
  );
};

export default BuddyCard;
