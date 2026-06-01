import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { config } from "./config.js";
import { getMockUser, resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/typeDefs.js";

async function bootstrap() {
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port },
    context: async () => {
      let userId: string | null = null;

      return {
        getUserId: async () => {
          if (!userId) {
            const user = await getMockUser();
            userId = user.id;
          }

          return userId;
        }
      };
    }
  });

  console.log(`GraphQL API ready at ${url}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
