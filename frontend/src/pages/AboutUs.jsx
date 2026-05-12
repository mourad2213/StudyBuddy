import "./AboutUs.css";

export default function AboutUs() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-inner">
          <span className="about-title">StudyBuddy</span>
          <p className="about-subtitle">Connect &amp; Lock In</p>
          <p className="about-hero-copy">
            StudyBuddy brings students together through shared courses, learning
            preferences, and availability. We help learners discover compatible
            study partners and turn solo sessions into better, more productive
            collaboration.
          </p>
        </div>
      </section>

      <section className="about-cards">
        <article className="about-card about-card--large">
          <h2>About us</h2>
          <p>
            StudyBuddy Matcher is a platform that helps students find compatible
            study partners based on shared courses, study preferences, and
            availability. It allows users to connect with students who have
            similar academic interests, schedule study sessions, and receive
            study partner recommendations.
          </p>
          <p>
            Our goal is to make studying more collaborative, organized, and
            productive while encouraging students to support and motivate each
            other.
          </p>
        </article>

        <article className="about-card">
          <h2>Our Vision</h2>
          <p>
            We aim to build a supportive academic community where students can
            easily connect, share knowledge, and achieve their learning goals
            together.
          </p>
        </article>

        <article className="about-card">
          <h2>Our Team</h2>
          <p>
            This project was developed by computer science students who believe
            learning is better together. Using modern technologies and user-
            centered design, we created a platform that makes it easier for
            students to find study partners.
          </p>
        </article>
      </section>

      <section className="about-feature">
        <div className="about-feature-box">
          <h2>Why StudyBuddy?</h2>
          <ul>
            <li>Find compatible study partners</li>
            <li>Organize study sessions easily</li>
            <li>Receive real-time notifications</li>
            <li>Communicate and collaborate with peers</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
