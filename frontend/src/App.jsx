import { BrowserRouter, Routes, Route } from "react-router-dom";

<BrowserRouter>
  <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/friends" element={<FriendRequests />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/create-session" element={<CreateSession />} />
            <Route path="/chat" element={<ChatApp />} />

    
  </Routes>
</BrowserRouter>;
