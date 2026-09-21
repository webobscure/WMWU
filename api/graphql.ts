import { ApolloServer, HeaderMap, type HTTPGraphQLRequest } from "@apollo/server";
import { createGraphQLContext, type GraphQLContext } from "../server/src/graphql/context.js";
import { resolvers } from "../server/src/graphql/resolvers.js";
import { typeDefs } from "../server/src/graphql/typeDefs.js";

type Request = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type Response = {
  statusCode: number;
  setHeader: (name: string, value: string | string[]) => void;
  write: (chunk: string) => void;
  end: (body?: string) => void;
};

const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers
});
const serverStarted = server.start();

function getHeader(headers: Request["headers"], name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value.join(", ") : value;
}

function parseBody(body: unknown, contentType?: string) {
  if (typeof body !== "string" || !contentType?.includes("application/json")) {
    return body;
  }

  return JSON.parse(body) as unknown;
}

export default async function handler(req: Request, res: Response) {
  try {
    await serverStarted;

    const headers = new HeaderMap();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key.toLowerCase(), Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const httpGraphQLRequest: HTTPGraphQLRequest = {
      method: (req.method ?? "POST").toUpperCase(),
      headers,
      search: new URL(req.url ?? "/api/graphql", "http://localhost").search,
      body: parseBody(req.body, getHeader(req.headers, "content-type"))
    };
    const response = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest,
      context: async () =>
        createGraphQLContext(getHeader(req.headers, "cookie"), (name, value) => res.setHeader(name, value))
    });

    for (const [name, value] of response.headers) {
      res.setHeader(name, value);
    }
    res.statusCode = response.status ?? 200;

    if (response.body.kind === "complete") {
      res.end(response.body.string);
      return;
    }

    for await (const chunk of response.body.asyncIterator) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error("GraphQL serverless handler failed", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ errors: [{ message: "GraphQL API временно недоступен." }] }));
  }
}
