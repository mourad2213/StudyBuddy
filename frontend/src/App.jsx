import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import FriendRequests from "./pages/FriendRequests.jsx";
import AvailabilityPage from "./pages/AvailabilityPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/friends" element={<FriendRequests />} />
      <Route path="/availability" element={<AvailabilityPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
    </Routes>
  );
}

export default App;