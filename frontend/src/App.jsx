import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/LoginPage";
import Signup from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import LandingPage from "./pages/LandingPage";
import Sessions from "./pages/Sessions";
import CreateSession from "./pages/CreateSession";
import FriendRequests from "./pages/FriendRequests";
import ChatApp from "./pages/ChatApp";


function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/ProfilePage" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendRequests />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/create-session" element={<CreateSession />} />
        <Route path="/chat" element={<ChatApp />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
