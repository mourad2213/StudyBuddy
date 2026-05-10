import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
} from "@apollo/client";

import { ApolloProvider } from "@apollo/client/react";

import App from "./App.jsx";
import "./index.css";
import "./App.css";

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem("token");

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      Authorization: token ? `Bearer ${token}` : "",
    },
  }));

  return forward(operation);
});

const dynamicHttpLink = new ApolloLink((operation) => {
  const uri =
    operation.getContext().uri || "http://localhost:4001/graphql";

  const httpLink = new HttpLink({ uri });

  return httpLink.request(operation);
});

const client = new ApolloClient({
  link: authLink.concat(dynamicHttpLink),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
);