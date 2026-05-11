import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import AvailabilityPage from "./pages/AvailabilityPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FriendRequests from "./pages/FriendRequests";
import ProfileSetup from "./pages/ProfileSetup";
import StudyPreferences from "./pages/StudyPreferences";
import UserProfile from "./pages/UserProfile";

import Header from "./components/Header";
import Footer from "./components/Footer";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Header />

        <main className="app-main">
          <Routes>
            {/* Existing routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />

            {/* Nour's routes */}
            <Route path="/auth-login" element={<Login />} />
            <Route path="/auth-signup" element={<Signup />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route
              path="/study-preferences"
              element={<StudyPreferences />}
            />
            <Route path="/friends" element={<FriendRequests />} />
            <Route path="/user-profile" element={<UserProfile />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;