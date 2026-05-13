import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <h2>StudyBuddy</h2>

      <div className="links">
        <Link to="/">Home</Link>
        <Link to="/">Find Buddy</Link>
        <Link to="/">Sessions</Link>
        <Link to="/">About Us</Link>
      </div>

      <div>
        <Link to="/login">Log In</Link>
        <Link to="/signup">Sign Up</Link>
      </div>
    </nav>
  );
}

export default Navbar;
