import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
} from "@apollo/client";

const authLink = new ApolloLink((operation, forward) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      Authorization: token ? `Bearer ${token}` : "",
    },
  }));

  return forward(operation);
});

// Fixed: Use session-service URL since that's what Sessions and CreateSession pages need
const httpLink = new HttpLink({
  uri: import.meta.env.VITE_SESSION_SERVICE_URL || "http://localhost:4007/graphql",
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;