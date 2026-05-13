import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import AvailabilityPage from "./pages/AvailabilityPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import FriendRequests from "./pages/FriendRequests.jsx";
import Sessions from "./pages/Sessions";
import ChatApp from "./pages/ChatApp";
import CreateSession from "./pages/CreateSession";
import MatchDetailsPage from "./pages/MatchDetailsPage";
import AboutUs from "./pages/AboutUs";

import ProfileSetup from "./pages/ProfileSetup";
import StudyPreferences from "./pages/StudyPreferences";
import UserProfile from "./pages/UserProfile";
import Dashboard from "./pages/Dashboard";
import FindBuddyPage from "./pages/recommendations.jsx";

import "./App.css";

function AppContent() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="app-wrapper">
      <Header />

      <main className="app-main">
        <Routes>
          {/* Main Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/find-buddy" element={<FindBuddyPage />} />

          {/* Match Details */}
          <Route path="/match/:userId" element={<MatchDetailsPage />} />

          {/* Onboarding flow */}
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/study-preferences" element={<StudyPreferences />} />

          {/* User profile */}
          <Route path="/user-profile" element={<UserProfile />} />

          {/* Friends & Sessions */}
          <Route path="/friends" element={<FriendRequests />} />
          <Route path="/requests" element={<FriendRequests />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/create-session" element={<CreateSession />} />
          <Route path="/chat" element={<ChatApp />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
