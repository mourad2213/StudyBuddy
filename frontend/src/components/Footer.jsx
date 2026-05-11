import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <p className="footer-copyright">© 2025 All Rights Reserved.</p>
        </div>

        <div className="footer-center">
          <img src="/logo.png" alt="StudyBuddy" className="footer-logo" />
        </div>

        <div className="footer-social">
          <a href="#" className="social-icon" aria-label="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
            </svg>
          </a>
          <a href="#" className="social-icon" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.756 0 8.334.01 7.053.072 2.695.272.273 2.69.073 7.052.01 8.333 0 8.756 0 12s.01 3.667.072 4.948c.2 4.358 2.618 6.78 6.98 6.98 1.281.063 1.703.073 4.948.073s3.667-.01 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.063-1.281.073-1.703.073-4.948s-.01-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.668.01 15.245 0 12 0z"></path>
              <circle cx="12" cy="12" r="3.6"></circle>
              <circle cx="18.406" cy="5.594" r=".6"></circle>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
