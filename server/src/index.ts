import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { GraphQLError } from "graphql";
import {
  createExpiredSessionCookie,
  createSessionCookie,
  getSessionTokenFromCookie,
  getUserBySessionToken,
  type SessionUser
} from "./auth.js";
import { config } from "./config.js";
import { resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/typeDefs.js";

async function bootstrap() {
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port },
    context: async ({ req, res }) => {
      const sessionToken = getSessionTokenFromCookie(req.headers.cookie);
      let currentUser: SessionUser | null | undefined;

      return {
        sessionToken,
        getCurrentUser: async () => {
          if (currentUser === undefined) {
            currentUser = await getUserBySessionToken(sessionToken);
          }

          return currentUser;
        },
        getUserId: async () => {
          if (currentUser === undefined) {
            currentUser = await getUserBySessionToken(sessionToken);
          }

          if (!currentUser) {
            throw new GraphQLError("Нужно войти в аккаунт.", {
              extensions: { code: "UNAUTHENTICATED" }
            });
          }

          return currentUser.id;
        },
        setSessionCookie: (token: string, expiresAt: Date) => {
          res.setHeader("Set-Cookie", createSessionCookie(token, expiresAt));
        },
        clearSessionCookie: () => {
          res.setHeader("Set-Cookie", createExpiredSessionCookie());
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
