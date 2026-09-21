import { GraphQLError } from "graphql";
import {
  createExpiredSessionCookie,
  createSessionCookie,
  getSessionTokenFromCookie,
  getUserBySessionToken,
  type SessionUser
} from "../auth.js";

export type GraphQLContext = {
  sessionToken: string | null;
  getCurrentUser: () => Promise<SessionUser | null>;
  getUserId: () => Promise<string>;
  setSessionCookie: (token: string, expiresAt: Date) => void;
  clearSessionCookie: () => void;
};

export function createGraphQLContext(
  cookieHeader: string | undefined,
  setResponseHeader: (name: string, value: string) => void
): GraphQLContext {
  const sessionToken = getSessionTokenFromCookie(cookieHeader);
  let currentUser: SessionUser | null | undefined;

  async function getCurrentUser() {
    if (currentUser === undefined) {
      currentUser = await getUserBySessionToken(sessionToken);
    }

    return currentUser;
  }

  return {
    sessionToken,
    getCurrentUser,
    getUserId: async () => {
      const user = await getCurrentUser();

      if (!user) {
        throw new GraphQLError("Нужно войти в аккаунт.", {
          extensions: { code: "UNAUTHENTICATED" }
        });
      }

      return user.id;
    },
    setSessionCookie: (token, expiresAt) => {
      setResponseHeader("Set-Cookie", createSessionCookie(token, expiresAt));
    },
    clearSessionCookie: () => {
      setResponseHeader("Set-Cookie", createExpiredSessionCookie());
    }
  };
}
