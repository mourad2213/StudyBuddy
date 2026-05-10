import Navbar from "../components/Navbar";

function LandingPage() {
  return (
    <>
      <Navbar />

      <div className="landing">
        <h1>StudyBuddy</h1>
        <p>Connect & Lock In</p>

        <button>Get Started</button>

        <section>
          <h2>Why do I need a Study Buddy?</h2>

          <div>
            <div>Get more done</div>
            <div>Make new friends</div>
            <div>Make it fun</div>
          </div>
        </section>
      </div>
    </>
  );
}

export default LandingPage;