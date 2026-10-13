import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { config } from "../config.js";
import { MovieApiService } from "./movieApi.js";

function createService(t: TestContext) {
  const previousKey = config.movieApiKey;
  config.movieApiKey = "test-key";
  t.after(() => { config.movieApiKey = previousKey; });
  return new MovieApiService();
}

const video = (key: string, overrides: Record<string, unknown> = {}) => ({
  id: key,
  key,
  name: "Official trailer",
  site: "YouTube",
  type: "Trailer",
  iso_639_1: "en",
  official: true,
  ...overrides
});

const videosResponse = (results: unknown[]) => new Response(JSON.stringify({ results }), {
  headers: { "content-type": "application/json" }
});

test("returns Russian trailers first, deduplicates videos and excludes clips, other sites and unsafe keys", async (t) => {
  const service = createService(t);
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    const url = new URL(input);
    calls.push(url);
    if (url.searchParams.get("language") === "ru-RU") {
      return videosResponse([
        video("ruofficial1", { iso_639_1: "ru" }),
        video("ruteaser001", { iso_639_1: "ru", type: "Teaser", name: "" }),
        video("notatrailer", { type: "Clip" }),
        video("othersite01", { site: "Vimeo" }),
        video("../../unsafe?autoplay=1")
      ]);
    }
    return videosResponse([
      video("enofficial1"),
      video("ruofficial1", { id: "duplicate" })
    ]);
  });

  const trailers = await service.getMovieTrailers("tmdb:movie:157336");
  assert.deepEqual(trailers.map((trailer) => trailer.key), ["ruofficial1", "ruteaser001", "enofficial1"]);
  assert.equal(trailers[1].name, "Тизер");
  assert.equal(trailers[0].language, "ru");
  assert.equal(calls.length, 2);
  assert(calls.every((url) => url.pathname.endsWith("/movie/157336/videos")));
  assert.deepEqual(calls.map((url) => url.searchParams.get("language")), ["ru-RU", "en-US"]);
});

test("uses the TV endpoint for series and prioritizes official trailers within a language", async (t) => {
  const service = createService(t);
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert(new URL(input).pathname.endsWith("/tv/1399/videos"));
    return videosResponse([
      video("unofficial1", { official: false }),
      video("enofficial1"),
      video("enoteaser01", { type: "Teaser" })
    ]);
  });

  const trailers = await service.getMovieTrailers("tmdb:tv:1399");
  assert.deepEqual(trailers.map((trailer) => trailer.key), ["enofficial1", "enoteaser01", "unofficial1"]);
});

test("keeps English trailers available when the Russian request fails", async (t) => {
  const service = createService(t);
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    if (new URL(input).searchParams.get("language") === "ru-RU") {
      return new Response(null, { status: 503 });
    }
    return videosResponse([video("enofficial1")]);
  });

  assert.equal((await service.getMovieTrailers("tmdb:movie:1"))[0].key, "enofficial1");
});

test("returns an empty list when there are no trailers", async (t) => {
  const service = createService(t);
  t.mock.method(globalThis, "fetch", async () => videosResponse([]));
  assert.deepEqual(await service.getMovieTrailers("tmdb:movie:1"), []);
});

test("reports an upstream failure instead of treating it as a film with no trailers", async (t) => {
  const service = createService(t);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });
  await assert.rejects(service.getMovieTrailers("tmdb:movie:1"), {
    extensions: { code: "MOVIE_TRAILERS_ERROR" }
  });
});

test("rejects an invalid movie identifier before sending a request", async (t) => {
  const service = createService(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => videosResponse([]));
  await assert.rejects(service.getMovieTrailers("invalid"), {
    extensions: { code: "BAD_USER_INPUT" }
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("discovery includes real vote counts, excludes weak signals and caches requests", async (t) => {
  const service = createService(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert(new URL(input).pathname.endsWith("/movie/popular"));
    return videosResponse([
      { id: 1, title: "Хорошая история", vote_average: 8.2, vote_count: 120 },
      { id: 2, title: "Один голос", vote_average: 10, vote_count: 1 },
      { id: 3, title: "Низкая оценка", vote_average: 3, vote_count: 1000 }
    ]);
  });
  const [first, second] = await Promise.all([service.getPopularMovies(), service.getPopularMovies()]);
  assert.equal(first.length, 1);
  assert.equal(first[0].ratingVotes, 120);
  assert.deepEqual(second, first);
  await service.getPopularMovies();
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("personal discovery uses recommendations for the correct movie or TV resource", async (t) => {
  const service = createService(t);
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    const path = new URL(input).pathname;
    paths.push(path);
    return videosResponse([{ id: 2, ...(path.includes("/tv/") ? { name: "Сериал" } : { title: "Фильм" }), vote_average: 8, vote_count: 200 }]);
  });
  assert.equal((await service.getRecommendedMovies("tmdb:movie:1"))[0].externalId, "tmdb:movie:2");
  assert.equal((await service.getRecommendedMovies("tmdb:tv:1"))[0].externalId, "tmdb:tv:2");
  assert(paths.some((path) => path.endsWith("/movie/1/recommendations")));
  assert(paths.some((path) => path.endsWith("/tv/1/recommendations")));
});
