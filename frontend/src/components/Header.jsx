import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Header.css";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUserId = localStorage.getItem("userId");
    setIsLoggedIn(Boolean(storedToken || storedUserId));
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((prev) => !prev);
  };

  const closeProfileMenu = () => {
    setIsProfileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setIsProfileMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
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

          <Link to="/" className="nav-link" onClick={closeMenu}>
            Home
          </Link>
          {isLoggedIn && (
            <>
              <Link to="/" className="nav-link" onClick={closeMenu}>
                Find Buddy
              </Link>
              <Link to="/" className="nav-link" onClick={closeMenu}>
                Sessions
              </Link>
            </>
          )}
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
          <>
            <div className="header-buttons desktop-only header-actions">
              <Link
                to="/profile"
                className="btn btn-login"
                onClick={closeProfileMenu}
              >
                Profile
              </Link>
              <div className="menu-dropdown-wrap">
                <button
                  type="button"
                  className="menu-dots-btn"
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  onClick={toggleProfileMenu}
                >
                  <span className="menu-dot"></span>
                  <span className="menu-dot"></span>
                  <span className="menu-dot"></span>
                </button>
                {isProfileMenuOpen && (
                  <div className="menu-dropdown" role="menu">
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={() => {
                        closeProfileMenu();
                        navigate("/requests");
                      }}
                    >
                      My Buddy Requests
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={() => {
                        closeProfileMenu();
                        navigate("/notifications");
                      }}
                    >
                      My Notifications
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="header-buttons mobile-only header-actions">
              <Link
                to="/profile"
                className="btn btn-login-mobile"
                onClick={closeProfileMenu}
              >
                Profile
              </Link>
              <div className="menu-dropdown-wrap">
                <button
                  type="button"
                  className="menu-dots-btn"
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  onClick={toggleProfileMenu}
                >
                  <span className="menu-dot"></span>
                  <span className="menu-dot"></span>
                  <span className="menu-dot"></span>
                </button>
                {isProfileMenuOpen && (
                  <div className="menu-dropdown" role="menu">
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={() => {
                        closeProfileMenu();
                        navigate("/requests");
                      }}
                    >
                      My Buddy Requests
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={() => {
                        closeProfileMenu();
                        navigate("/notifications");
                      }}
                    >
                      My Notifications
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
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
