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
  return (
    <div className="thq-buddy-card-fadi-elm">
      <div className="thq-pfp-elm1">
        <img src={avatarSrc} alt={avatarAlt} className="thq-ellipse2-elm" />
      </div>
      <span className="thq-text-elm21">{name}</span>
      <div className="thq-description-elm1">
        <span className="thq-text-elm22">
          <span className="thq-text-elm23">Major:</span>
          <span>{major}</span>
        </span>
        <span className="thq-text-elm25">Year: {year}</span>
        <span className="thq-text-elm26">
          <span className="thq-text-elm27">Study Style:</span>
          <span>{studyStyle}</span>
        </span>
        <span className="thq-text-elm29">
          <span className="thq-text-elm30">Courses:</span>
          <span>{courses}</span>
        </span>
      </div>
    </div>
  );
};

export default BuddyCard;
