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

const dynamicHttpLink = new ApolloLink((operation) => {
  const uri = operation.getContext().uri || import.meta.env.VITE_USER_URL || "http://localhost:4001/graphql";
  const httpLink = new HttpLink({ uri });
  return httpLink.request(operation);
});

const client = new ApolloClient({
  link: authLink.concat(dynamicHttpLink),
  cache: new InMemoryCache(),
});

export default client;