import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import WhyCard from "../components/WhyCard";
import BuddyCard from "../components/BuddyCard";
import { GET_ALL_USERS } from "../graphql/queries/user";
import { GET_ALL_PROFILES } from "../graphql/queries/profiles";
import "./LandingPage.css";

const PROFILE_GRAPHQL = "http://localhost:4006/graphql";
const AVATAR_POOL = [
  "/avatar-fadi.svg",
  "/avatar-sofyan.svg",
  "/avatar-tala.svg",
];

const LandingPage = () => {
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useQuery(GET_ALL_USERS);

  const {
    data: profilesData,
    loading: profilesLoading,
    error: profilesError,
  } = useQuery(GET_ALL_PROFILES, {
    context: { uri: PROFILE_GRAPHQL },
  });

  // Merge users with profiles to build buddy cards.
  const buddyCards = useMemo(() => {
    const users = usersData?.getAllUsers || [];
    const profiles = profilesData?.getAllProfiles || [];
    const userById = new Map(users.map((user) => [user.id, user]));

    return profiles.reduce((acc, profile) => {
      const user = userById.get(profile.userId);
      if (!user) return acc;

      const courses = profile.courses?.map((course) => course.name) || [];
      const index = acc.length;

      acc.push({
        id: profile.id || profile.userId,
        userId: profile.userId,
        name: user.name,
        major: profile.major,
        year: profile.academicYear,
        studyStyle: profile.preferences?.style,
        courses,
        avatarSrc: AVATAR_POOL[index % AVATAR_POOL.length],
        avatarAlt: `${user.name} avatar`,
      });

      return acc;
    }, []);
  }, [usersData, profilesData]);

  const isLoading = usersLoading || profilesLoading;
  const hasError = usersError || profilesError;

  return (
    <div className="landing-container">
      <div className="thq-landing-page-elm">
        {/* Hero / Title Section */}
        <div className="thq-title-elm">
          <span className="thq-text-elm10">StudyBuddy</span>
          <span className="thq-text-elm11">Connect &amp; Lock In</span>
          <Link className="thq-button-elm1" to="/signup">
            <span className="thq-text-elm12">Get Started</span>
          </Link>
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
          {isLoading ? (
            <p>Loading buddies...</p>
          ) : hasError ? (
            <p>Unable to load buddies right now.</p>
          ) : buddyCards.length === 0 ? (
            <p>No buddies to show yet.</p>
          ) : (
            buddyCards.map((buddy) => (
              <Link
                key={buddy.id}
                className="buddy-card-link"
                to={`/match/${buddy.userId}`}
              >
                <BuddyCard
                  name={buddy.name}
                  major={buddy.major}
                  year={buddy.year}
                  studyStyle={buddy.studyStyle}
                  courses={buddy.courses}
                  avatarSrc={buddy.avatarSrc}
                  avatarAlt={buddy.avatarAlt}
                />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
