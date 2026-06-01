import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: "/graphql"
  }),
  cache: new InMemoryCache({
    typePolicies: {
      Collection: {
        fields: {
          movies: {
            merge: false
          }
        }
      }
    }
  })
});
