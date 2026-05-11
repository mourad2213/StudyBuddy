import React from "react";
import WhyCard from "../components/WhyCard";
import BuddyCard from "../components/BuddyCard";
import "./LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-container">
      <div className="thq-landing-page-elm">
        {/* Hero / Title Section */}
        <div className="thq-title-elm">
          <span className="thq-text-elm10">StudyBuddy</span>
          <span className="thq-text-elm11">Connect &amp; Lock In</span>
          <button className="thq-button-elm1">
            <span className="thq-text-elm12">Get Started</span>
          </button>
        </div>

        {/* Why Study Buddy Section */}
        <div className="thq-whycard-elm">
          <span className="thq-text-elm14">
            “Why do I need a Study Buddy? “
          </span>
          <div className="thq-frame3-elm">
            <WhyCard
              title="Get more done"
              iconSrc="/icon-books.svg"
              description="Hold each other accountable to finish tasks more quickly"
            />
            <WhyCard
              title="Make new friends"
              iconSrc="/icon-friends.svg"
              description="Can't go wrong with more connections!"
            />
            <WhyCard
              title="Make it fun"
              iconSrc="/icon-fun.svg"
              description="Better than studying alone; at least suffer together"
            />
          </div>
        </div>

        {/* Explore Section */}
        <div className="thq-explore-buddies-elm">
          <span className="thq-text-elm13">Explore Potential Buddies</span>
        </div>

        {/* Buddy Cards */}
        <div className="thq-buddy-grid">
          <BuddyCard
            name="Fadi A."
            major="Data Science"
            year="3"
            studyStyle="Reading/Writing"
            courses="Advanced ML, Image Processing and computer vision, Big Data, Cloud Computing"
            avatarSrc="/avatar-fadi.svg"
            avatarAlt="Fadi avatar"
          />

          <BuddyCard
            name="Sofyan K."
            major="Data Science"
            year="3"
            studyStyle="Reading/Writing"
            courses="Advanced ML, Image Processing and computer vision, Big Data, Cloud Computing"
            avatarSrc="/avatar-sofyan.svg"
            avatarAlt="Sofyan avatar"
          />

          <BuddyCard
            name="Tala M."
            major="Software Engineering"
            year="3"
            studyStyle="Body-Doubling"
            courses="Advanced ML, Mobile Development, Cloud Computing, Software Project II"
            avatarSrc="/avatar-tala.svg"
            avatarAlt="Tala avatar"
          />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
