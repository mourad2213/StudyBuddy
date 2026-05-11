import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} from "@apollo/client";

import { ApolloProvider } from "@apollo/client/react";

import "./index.css";
import App from "./App";

/* Apollo Clients */
export const userClient = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:4001/graphql",
  }),
  cache: new InMemoryCache(),
});

export const profileClient = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:4006/graphql",
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