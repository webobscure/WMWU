import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { config } from "./config.js";
import { createGraphQLContext } from "./graphql/context.js";
import { resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/typeDefs.js";

async function bootstrap() {
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port },
    context: async ({ req, res }) =>
      createGraphQLContext(req.headers.cookie, (name, value) => res.setHeader(name, value))
  });

  console.log(`GraphQL API ready at ${url}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
