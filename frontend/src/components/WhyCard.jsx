import React from 'react';

const WhyCard = ({ title, iconSrc, description }) => {
  return (
    <div className="thq-group6-elm">
      <span className="thq-text-elm15">{title}</span>
      <img src={iconSrc} alt={title} className="thq-wpfbooks-elm" />
      <span className="thq-text-elm16">{description}</span>
    </div>
  );
};

export default WhyCard;