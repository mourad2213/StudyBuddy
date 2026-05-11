import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FriendRequests from "./pages/FriendRequests";
import Sessions from "./pages/Sessions";
import ChatApp from "./pages/ChatApp";
import CreateSession from "./pages/CreateSession";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/friends" element={<FriendRequests />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/create-session" element={<CreateSession />} />
            <Route path="/chat" element={<ChatApp />} />

          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
