import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

const client = new ApolloClient({
  uri: "http://localhost:4001/graphql",
  cache: new InMemoryCache(),
});

<ApolloProvider client={client}>
  <App />
</ApolloProvider>;
