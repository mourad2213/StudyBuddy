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
const sessionServiceUrl = "http://localhost:4007/graphql";
const notificationServiceUrl = "http://localhost:4005/graphql";

// Create links for different services
const userServiceLink = createHttpLink({ uri: userServiceUrl });
const sessionServiceLink = createHttpLink({ uri: sessionServiceUrl });
const notificationServiceLink = createHttpLink({ uri: notificationServiceUrl });

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

  if (sessionOperations.includes(operationName)) {
    operation.setContext({ uri: sessionServiceUrl });
    return sessionServiceLink.request(operation, forward);
  }

  if (notificationOperations.includes(operationName)) {
    operation.setContext({ uri: notificationServiceUrl });
    return notificationServiceLink.request(operation, forward);
  }

  // Default to user service
  operation.setContext({ uri: userServiceUrl });
  return userServiceLink.request(operation, forward);
});

const client = new ApolloClient({
  link: routerLink,
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
