import React from "react";
import ReactDOM from "react-dom/client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
  split,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { ApolloProvider } from "@apollo/client/react";
import App from "./App";
import "./index.css";

/* =========================
   Debug ENV Vars
========================= */
console.log("🔍 ENV VARS CHECK:");
console.log("VITE_USER_URL:", import.meta.env.VITE_USER_URL);
console.log("VITE_PROFILE_URL:", import.meta.env.VITE_PROFILE_URL);
console.log("VITE_SESSION_URL:", import.meta.env.VITE_SESSION_URL);
console.log("VITE_NOTIFICATION_URL:", import.meta.env.VITE_NOTIFICATION_URL);
console.log("VITE_MATCHING_URL:", import.meta.env.VITE_MATCHING_URL);
console.log("VITE_MESSAGING_URL:", import.meta.env.VITE_MESSAGING_URL);
console.log("VITE_AVAILABILITY_URL:", import.meta.env.VITE_AVAILABILITY_URL);

/* =========================
   Service URLs
========================= */
const userServiceUrl = import.meta.env.VITE_USER_URL || "http://localhost:4001/graphql";
const profileServiceUrl = import.meta.env.VITE_PROFILE_URL || "http://localhost:4006/graphql";
const sessionServiceUrl = import.meta.env.VITE_SESSION_URL || "http://localhost:4007/graphql";
const notificationServiceUrl = import.meta.env.VITE_NOTIFICATION_URL || "http://localhost:4005/graphql";
const matchingServiceUrl = import.meta.env.VITE_MATCHING_URL || "http://localhost:4002/graphql";
const messagingServiceUrl = import.meta.env.VITE_MESSAGING_URL || "http://localhost:4003/graphql";
const availabilityServiceUrl = import.meta.env.VITE_AVAILABILITY_URL || "http://localhost:4004/graphql";

console.log("🔍 RESOLVED SERVICE URLS:");
console.log("User:", userServiceUrl);
console.log("Profile:", profileServiceUrl);
console.log("Session:", sessionServiceUrl);
console.log("Notification:", notificationServiceUrl);
console.log("Matching:", matchingServiceUrl);
console.log("Messaging:", messagingServiceUrl);
console.log("Availability:", availabilityServiceUrl);

/* =========================
   Convert HTTP to WS for subscriptions
========================= */
const toWsUrl = (httpUrl) => {
  if (!httpUrl) return null;
  return httpUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    .replace(/\/graphql$/, "/graphql");
};

/* =========================
   HTTP Links
========================= */
const userServiceLink = new HttpLink({ uri: userServiceUrl });
const profileServiceLink = new HttpLink({ uri: profileServiceUrl });
const sessionServiceLink = new HttpLink({ uri: sessionServiceUrl });
const notificationServiceLink = new HttpLink({ uri: notificationServiceUrl });
const matchingServiceLink = new HttpLink({ uri: matchingServiceUrl });
const messagingServiceLink = new HttpLink({ uri: messagingServiceUrl });
const availabilityServiceLink = new HttpLink({ uri: availabilityServiceUrl });

/* =========================
   WebSocket Links for Subscriptions
========================= */
const createWsLink = (httpUrl) => {
  const wsUrl = toWsUrl(httpUrl);
  return new GraphQLWsLink(
    createClient({
      url: wsUrl,
    })
  );
};

const userWsLink = createWsLink(userServiceUrl);
const notificationWsLink = createWsLink(notificationServiceUrl);
const messagingWsLink = createWsLink(messagingServiceUrl);

/* =========================
   Operation Names
========================= */
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

const notificationOperations = [
  "GetNotifications",
  "GetUnreadNotifications",
  "GetUnreadCount",
  "MarkAsRead",
  "onMarkAsRead",
  "MarkAllAsRead",
  "DeleteNotification",
  "UpdateNotificationMessage",
  "OnNotificationReceived",
];

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

const matchingOperations = [
  "GetMatches",
  "GetMatch",
  "CreateMatch",
  "UpdateMatch",
  "DeleteMatch",
  "GetPendingMatches",
  "AcceptMatch",
  "RejectMatch",
];

const messagingOperations = [
  "GetMessages",
  "SendMessage",
  "GetConversation",
  "GetConversations",
  "DeleteMessage",
  "MarkMessageAsRead",
  "OnMessageReceived",
];

const availabilityOperations = [
  "GetAvailability",
  "SetAvailability",
  "UpdateAvailability",
  "DeleteAvailability",
  "GetUserAvailability",
];

/* =========================
   Router Link
========================= */
const routerLink = new ApolloLink((operation) => {
  const { operationName } = operation;
  console.log("🔀 Routing operation:", operationName);

  if (sessionOperations.includes(operationName)) {
    console.log("→ Session service");
    return sessionServiceLink.request(operation);
  }
  if (notificationOperations.includes(operationName)) {
    console.log("→ Notification service");
    // Use WS for subscriptions, HTTP for queries/mutations
    const definition = getMainDefinition(operation.query);
    const link = definition.operation === "subscription" ? notificationWsLink : notificationServiceLink;
    return link.request(operation);
  }
  if (profileOperations.includes(operationName)) {
    console.log("→ Profile service");
    return profileServiceLink.request(operation);
  }
  if (matchingOperations.includes(operationName)) {
    console.log("→ Matching service");
    return matchingServiceLink.request(operation);
  }
  if (messagingOperations.includes(operationName)) {
    console.log("→ Messaging service");
    // Use WS for subscriptions, HTTP for queries/mutations
    const definition = getMainDefinition(operation.query);
    const link = definition.operation === "subscription" ? messagingWsLink : messagingServiceLink;
    return link.request(operation);
  }
  if (availabilityOperations.includes(operationName)) {
    console.log("→ Availability service");
    return availabilityServiceLink.request(operation);
  }

  console.log("→ User service (default)");
  // Use WS for subscriptions, HTTP for queries/mutations
  const definition = getMainDefinition(operation.query);
  const link = definition.operation === "subscription" ? userWsLink : userServiceLink;
  return link.request(operation);
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

export { client };
