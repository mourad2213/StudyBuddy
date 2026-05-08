import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FriendRequests from "./pages/FriendRequests";
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
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
