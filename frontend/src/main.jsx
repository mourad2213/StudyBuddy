import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} from "@apollo/client";

import { ApolloProvider } from "@apollo/client/react";

import App from "./App";
import "./index.css";

/* Service URLs */
const userServiceUrl = "http://localhost:4001/graphql";
const profileServiceUrl = "http://localhost:4006/graphql";
const sessionServiceUrl = "http://localhost:4007/graphql";

/* Apollo Clients */
export const userClient = new ApolloClient({
  link: new HttpLink({
    uri: userServiceUrl,
  }),
  cache: new InMemoryCache(),
});

export const profileClient = new ApolloClient({
  link: new HttpLink({
    uri: profileServiceUrl,
  }),
  cache: new InMemoryCache(),
});

export const sessionClient = new ApolloClient({
  link: new HttpLink({
    uri: sessionServiceUrl,
  }),
  cache: new InMemoryCache(),
});

/* Render App */
ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ApolloProvider client={userClient}>
      <App />
    </ApolloProvider>
  </StrictMode>
);