import React from "react";
import "./Dashboard.css"; // We'll create this if needed

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <h1>Welcome to Your Dashboard</h1>
        <p>This is a placeholder dashboard. The design is not yet finalized.</p>
        <div className="dashboard-sections">
          <div className="dashboard-card">
            <h2>Study Sessions</h2>
            <p>View and manage your study sessions.</p>
            <button>Go to Sessions</button>
          </div>
          <div className="dashboard-card">
            <h2>Find Buddies</h2>
            <p>Find study buddies based on your preferences.</p>
            <button>Find Buddies</button>
          </div>
          <div className="dashboard-card">
            <h2>Notifications</h2>
            <p>Check your latest notifications.</p>
            <button>View Notifications</button>
          </div>
          <div className="dashboard-card">
            <h2>Profile</h2>
            <p>Update your profile and preferences.</p>
            <button>Edit Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}
