import React from "react";
import ReactDOM from "react-dom/client";

import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
} from "@apollo/client";

import { ApolloProvider } from "@apollo/client/react";

import App from "./App";
import "./index.css";

/* =========================
   Service URLs
========================= */
const userServiceUrl = "http://localhost:4001/graphql";
const profileServiceUrl = "http://localhost:4006/graphql";
const sessionServiceUrl = "http://localhost:4007/graphql";
const notificationServiceUrl = "http://localhost:4005/graphql";

/* =========================
   HTTP Links
========================= */
const userServiceLink = new HttpLink({
  uri: userServiceUrl,
});

const profileServiceLink = new HttpLink({
  uri: profileServiceUrl,
});

const sessionServiceLink = new HttpLink({
  uri: sessionServiceUrl,
});

const notificationServiceLink = new HttpLink({
  uri: notificationServiceUrl,
});

/* =========================
   Operation Names
========================= */

// Session Service Operations
const sessionOperations = [
  "CreateStudySession",
  "RespondToSessionInvitation",
  "JoinSession",
  "LeaveSession",
  "CancelSession",
  "GetUpcomingSessions",
  "GetPastSessions",
  "GetSessionAcceptedMembers",
  "GetPendingInvitations",
  "GetSessionById",
];

// Notification Service Operations
const notificationOperations = [
  "GetNotifications",
  "GetUnreadNotifications",
  "GetUnreadCount",
  "MarkAsRead",
  "onMarkAsRead",
  "MarkAllAsRead",
  "DeleteNotification",
  "UpdateNotificationMessage",
];

// Profile Service Operations
  const profileOperations = [
    "GetProfile",
    "GetProfileByUserId",
    "UpdateProfile",
    "CreateProfile",
    "SaveProfile",
    "AddCourse",
    "AddTopic",
    "SetPreference",
    "UpdatePreference",
    "CreateOrUpdateProfile",
    "UpdateCourse",
    "DeleteCourse",
    "UpdateTopic",
    "DeleteTopic",
    "GetAllProfiles",
  ];

/* =========================
   Router Link
========================= */
const routerLink = new ApolloLink((operation) => {
  const { operationName } = operation;

  // SESSION SERVICE
  if (sessionOperations.includes(operationName)) {
    return sessionServiceLink.request(operation);
  }

  // NOTIFICATION SERVICE
  if (notificationOperations.includes(operationName)) {
    return notificationServiceLink.request(operation);
  }

  // PROFILE SERVICE
  if (profileOperations.includes(operationName)) {
    return profileServiceLink.request(operation);
  }

  // DEFAULT -> USER SERVICE
  return userServiceLink.request(operation);
});

/* =========================
   Apollo Client
========================= */
const client = new ApolloClient({
  link: routerLink,
  cache: new InMemoryCache(),
});

/* =========================
   Render App
========================= */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);

export { client as userClient };
export { client as profileClient };