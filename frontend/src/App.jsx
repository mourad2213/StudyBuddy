import { BrowserRouter, Routes, Route } from "react-router-dom";

// Existing pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FriendRequests from "./pages/FriendRequests";

// Your pages
import ProfileSetup from "./pages/ProfileSetup";
import StudyPreferences from "./pages/StudyPreferences";
import UserProfile from "./pages/UserProfile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Post-signup onboarding flow */}
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/study-preferences" element={<StudyPreferences />} />

        {/* Main app */}
        <Route path="/friends" element={<FriendRequests />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </BrowserRouter>
  );
}