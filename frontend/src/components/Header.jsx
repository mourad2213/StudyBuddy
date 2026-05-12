import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Header.css";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Error parsing stored user data:", e);
      }
    }
  }, []);

  const homeLink = isLoggedIn ? "/dashboard" : "/";

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUser(null);
    // Optionally redirect to login page
    window.location.href = "/";
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to={homeLink} className="header-logo">
          <img src="/logo.png" alt="StudyBuddy" className="logo-img" />
        </Link>

        <nav className={`header-nav ${isMenuOpen ? "mobile-open" : ""}`}>
          <button
            className="close-menu-btn"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>

          <Link to={homeLink} className="nav-link" onClick={closeMenu}>
            Home
          </Link>
          <Link to="/" className="nav-link" onClick={closeMenu}>
            Find Buddy
          </Link>
          <Link to="/sessions" className="nav-link" onClick={closeMenu}>
            Sessions
          </Link>
          <Link to="/" className="nav-link" onClick={closeMenu}>
            About Us
          </Link>
        </nav>

        {!isLoggedIn ? (
          <>
            <div className="header-buttons desktop-only">
              <Link to="/login" className="btn btn-login">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-signup">
                Sign Up
              </Link>
            </div>

            <div className="header-buttons mobile-only">
              <Link to="/login" className="btn btn-login-mobile">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-signup-mobile">
                Sign Up
              </Link>
            </div>
          </>
        ) : (
          <div className="header-user-section">
            <span className="user-greeting">
              Hi, {user?.name || user?.username || "User"}
            </span>
            <Link
              to="/user-profile"
              className="profile-icon-btn"
              aria-label="User profile"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="svg-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </Link>
            <button className="notification-btn" aria-label="Notifications">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="svg-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
            </button>
            <button
              className="logout-btn"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="svg-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                />
              </svg>
            </button>
          </div>
        )}

        <button
          className="hamburger-menu"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${isMenuOpen ? "open" : ""}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? "open" : ""}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? "open" : ""}`}></span>
        </button>
      </div>

      {isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}
    </header>
  );
}
