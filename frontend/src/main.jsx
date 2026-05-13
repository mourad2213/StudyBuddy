import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { getMainDefinition } from "@apollo/client/utilities";
import { from } from "@apollo/client";
import App from "./App";
import "./index.css";

// Service URLs
const userServiceUrl = "http://localhost:4001/graphql";
const availabilityServiceUrl = "http://localhost:4002/graphql";
const matchingServiceUrl = "http://localhost:4003/graphql";
const profileServiceUrl = "http://localhost:4006/graphql";
const sessionServiceUrl = "http://localhost:4007/graphql";
const notificationServiceUrl = "http://localhost:4005/graphql";
const messagingServiceUrl = "http://localhost:4008/graphql";

// Create links for different services
const userServiceLink = createHttpLink({ uri: userServiceUrl });
const availabilityServiceLink = createHttpLink({ uri: availabilityServiceUrl });
const matchingServiceLink = createHttpLink({ uri: matchingServiceUrl });
const profileServiceLink = createHttpLink({ uri: profileServiceUrl });
const sessionServiceLink = createHttpLink({ uri: sessionServiceUrl });
const notificationServiceLink = createHttpLink({ uri: notificationServiceUrl });
const messagingServiceLink = createHttpLink({ uri: messagingServiceUrl });

// Router link - direct operations to the correct service
import { ApolloLink } from "@apollo/client";

const routerLink = new ApolloLink((operation, forward) => {
  const { operationName } = operation;
  
  // Session service operations - use correct operation names from GraphQL queries/mutations
  const sessionOperations = [
    'CreateStudySession',
    'RespondToSessionInvitation',
    'JoinSession',
    'LeaveSession',
    'CancelSession',
    'GetUpcomingSessions',
    'GetPastSessions',
    'GetSessionAcceptedMembers',
    'GetPendingInvitations',
    'GetSessionById',
  ];

  // Availability service operations
  const availabilityOperations = [
    'GetAvailability',
    'CreateAvailability',
    'UpdateAvailability',
    'DeleteAvailability',
  ];

  // Matching service operations
  const matchingOperations = [
    'GetRecommendations',
    'AcceptRecommendation',
    'CreateBuddyRequest',
    'AcceptBuddyRequest',
    'RejectBuddyRequest',
    'GetIncomingBuddyRequests',
    'GetOutgoingBuddyRequests',
    'GetConnections',
  ];

  // Messaging service operations
  const messagingOperations = [
    'GetConversations',
    'GetMessages',
    'SendMessage',
    'CreateConversation',
  ];

  // Notification service operations
  const notificationOperations = [
    'GetNotifications',
    'GetUnreadNotifications',
    'GetUnreadCount',
    'MarkAsRead',
    'onMarkAsRead',
    'MarkAllAsRead',
    'DeleteNotification',
    'UpdateNotificationMessage',
  ];

  // Profile service operations
  const profileOperations = [
    'GetAllProfiles',
    'GetProfile',
    'GetProfileByUserId',
    'UpdateProfile',
    'CreateProfile',
  ];

  if (sessionOperations.includes(operationName)) {
    operation.setContext({ uri: sessionServiceUrl });
    return sessionServiceLink.request(operation, forward);
  }

  if (availabilityOperations.includes(operationName)) {
    operation.setContext({ uri: availabilityServiceUrl });
    return availabilityServiceLink.request(operation, forward);
  }

  if (matchingOperations.includes(operationName)) {
    operation.setContext({ uri: matchingServiceUrl });
    return matchingServiceLink.request(operation, forward);
  }

  if (messagingOperations.includes(operationName)) {
    operation.setContext({ uri: messagingServiceUrl });
    return messagingServiceLink.request(operation, forward);
  }

  if (notificationOperations.includes(operationName)) {
    operation.setContext({ uri: notificationServiceUrl });
    return notificationServiceLink.request(operation, forward);
  }

  if (profileOperations.includes(operationName)) {
    operation.setContext({ uri: profileServiceUrl });
    return profileServiceLink.request(operation, forward);
  }

  // Default to user service
  operation.setContext({ uri: userServiceUrl });
  return userServiceLink.request(operation, forward);
});

const client = new ApolloClient({
  link: routerLink,
  cache: new InMemoryCache(),
});

// Dedicated client for profile-specific operations
export const profileClient = new ApolloClient({
  link: profileServiceLink,
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);