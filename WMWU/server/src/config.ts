import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));

loadEnv({ path: resolve(serverDir, "../.env") });
loadEnv({ path: resolve(serverDir, ".env") });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  movieApiKey: process.env.MOVIE_API_KEY,
  movieApiUrl: process.env.MOVIE_API_URL ?? "https://api.themoviedb.org/3",
  mockUserEmail: "demo@movie.local"
};
