import assert from "node:assert/strict";
import { test } from "node:test";
import { rankRecommendations, type RatingEntry } from "./recommendations.js";

const rating = (userId: string, movieId: string, personalRating: number | null, genres = ["Драма"]): RatingEntry => ({ userId, movieId, personalRating, genres });

test("cold start uses viewer ratings and favors reliable scores over a single perfect vote", () => {
  const community = Array.from({ length: 20 }, (_, index) => rating(`viewer${index}`, "popular", 8));
  community.push(rating("one", "single", 10));
  const recommendations = rankRecommendations([], community);
  assert.equal(recommendations[0].movieId, "popular");
  assert.equal(recommendations[0].ratingCount, 20);
  assert.equal(recommendations[0].mode, "COMMUNITY");
});

test("excludes all saved movies, including unrated watchlist entries", () => {
  const own = [rating("me", "watched", 9), rating("me", "planned", null)];
  const community = [rating("other", "watched", 9), rating("other", "planned", 10), rating("other", "new", 8)];
  assert.deepEqual(rankRecommendations(own, community).map((entry) => entry.movieId), ["new"]);
});

test("requires two overlapping ratings for similar tastes and rejects opposing ratings", () => {
  const own = [rating("me", "a", 9), rating("me", "b", 8)];
  const community = [
    rating("similar", "a", 9), rating("similar", "b", 8), rating("similar", "good-match", 9),
    rating("opposite", "a", 1), rating("opposite", "b", 2), rating("opposite", "opposite-pick", 9)
  ];
  const recommendations = rankRecommendations(own, community);
  assert.equal(recommendations.find((entry) => entry.movieId === "good-match")?.mode, "SIMILAR_TASTES");
  assert.notEqual(recommendations.find((entry) => entry.movieId === "opposite-pick")?.mode, "SIMILAR_TASTES");
  assert.equal(rankRecommendations(own.slice(0, 1), community).find((entry) => entry.movieId === "good-match")?.mode, "GENRES");
});

test("uses liked genres when no similar viewers are available", () => {
  const own = [rating("me", "favorite", 10, ["Фантастика"])];
  const community = [rating("a", "science-fiction", 8, ["Фантастика"]), rating("b", "comedy", 8, ["Комедия"])];
  const recommendations = rankRecommendations(own, community);
  assert.equal(recommendations[0].movieId, "science-fiction");
  assert.equal(recommendations[0].mode, "GENRES");
});

test("does not count a duplicated vote twice or include invalid ratings", () => {
  const vote = rating("a", "movie", 8);
  const recommendations = rankRecommendations([], [vote, vote, rating("b", "movie", 10), rating("c", "invalid", 11), rating("d", "unrated", null)]);
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].ratingCount, 2);
  assert.equal(recommendations[0].viewerRating, 9);
});

test("does not infer approval from watched status or recommend generally disliked films", () => {
  assert.deepEqual(rankRecommendations([], [rating("a", "disliked", 2), rating("b", "unrated", null)]), []);
});
