import { ApolloServer } from "@apollo/server";
import { GraphQLError } from "graphql";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { movieApiService } from "../services/movieApi.js";
import { prisma } from "../db/prisma.js";
import type { GraphQLContext } from "./context.js";
import { resolvers } from "./resolvers.js";
import { typeDefs } from "./typeDefs.js";

// This test creates and removes its own records; it never resets or seeds the application database.
test("reviews, canonical ratings, recommendation signals and profile ownership persist through GraphQL", async (t) => {
  t.mock.method(movieApiService, "getPopularMovies", async () => []);
  t.mock.method(movieApiService, "getRecommendedMovies", async () => []);
  const database = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1", "::1"].includes(database.hostname), "Integration tests require a local database.");
  const prefix = `wmwu-test-${randomUUID()}`;
  const userIds = [1, 2, 3].map((id) => `${prefix}-u${id}`);
  const movieIds = [1, 2, 3].map((id) => `${prefix}-m${id}`);
  const externalId = `${prefix}-external`;
  const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
  await server.start();
  const context = (userId: string): GraphQLContext => ({
    sessionToken: null, getCurrentUser: () => prisma.user.findUnique({ where: { id: userId } }),
    getUserId: async () => userId, setSessionCookie: () => undefined, clearSessionCookie: () => undefined
  });
  async function request(query: string, variables: Record<string, unknown> = {}, userId = userIds[0]) {
    const response = await server.executeOperation({ query, variables }, { contextValue: context(userId) });
    assert.equal(response.body.kind, "single");
    if (response.body.kind !== "single") throw new Error("Unexpected streaming response.");
    return response.body.singleResult;
  }
  const publish = `mutation($id: String!, $input: ReviewInput!) { publishReview(externalId: $id, input: $input) { id rating text hasSpoilers createdAt updatedAt author { id name } } }`;
  const feedbackQuery = `query($id: String!) { movieFeedback(externalId: $id) { averageRating ratingCount reviewCount myRating myReview { id } reviews { id rating text author { id name } } } }`;
  try {
    await prisma.user.createMany({ data: userIds.map((id, index) => ({ id, name: `QA Viewer ${index + 1}`, email: `${id}@example.test` })) });
    await prisma.movie.createMany({ data: movieIds.map((id, index) => ({ id, externalId: index ? `${externalId}-${index}` : externalId, titleRu: `QA Movie ${index + 1}`, genres: ["Драма"] })) });
    const first = await request(publish, { id: externalId, input: { rating: 8, text: "Очень интересный фильм, который хочется пересмотреть.", hasSpoilers: true } });
    assert.equal(first.errors, undefined);
    const firstReview = first.data!.publishReview as { id: string; rating: number; createdAt: string; updatedAt: string };
    assert.equal(firstReview.createdAt, firstReview.updatedAt);
    const edited = await request(publish, { id: externalId, input: { rating: 9, text: "После повторного просмотра поставил более высокую оценку.", hasSpoilers: false } });
    assert.equal((edited.data!.publishReview as { id: string }).id, firstReview.id);
    await request(publish, { id: externalId, input: { rating: 6, text: "Неплохой фильм, хотя ожидания были немного выше.", hasSpoilers: false } }, userIds[1]);
    const feedback = (await request(feedbackQuery, { id: externalId })).data!.movieFeedback as { averageRating: number; ratingCount: number; reviewCount: number };
    assert.deepEqual([feedback.averageRating, feedback.ratingCount, feedback.reviewCount], [7.5, 2, 2]);

    const forbidden = await request(`mutation($id:ID!){deleteReview(id:$id)}`, { id: firstReview.id }, userIds[2]);
    assert.equal(forbidden.errors?.[0].extensions?.code, "NOT_FOUND");
    assert.equal(await prisma.review.count({ where: { userMovie: { movieId: movieIds[0] } } }), 2);
    const invalid = await request(publish, { id: externalId, input: { rating: 11, text: "Этот отзыв не должен быть сохранён.", hasSpoilers: false } }, userIds[2]);
    assert.equal(invalid.errors?.[0].extensions?.code, "BAD_USER_INPUT");
    assert.equal(await prisma.userMovie.count({ where: { userId: userIds[2] } }), 0);

    await prisma.userMovie.update({ where: { userId_movieId: { userId: userIds[0], movieId: movieIds[0] } }, data: { note: "private-note-sentinel" } });
    await request(`mutation($input:ProfileInput!){updateProfile(input:$input){id name bio}}`, { input: { name: "Кинозритель", bio: "Люблю драмы" } });
    await request(`mutation($input:ProfileInput!){updateProfile(input:$input){id name bio}}`, { input: { name: "Новое имя" } });
    const privateProfile = await request(`query { myProfile { id bio recentRatings { personalRating note } } }`);
    assert.equal((privateProfile.data!.myProfile as { bio: string }).bio, "Люблю драмы");
    const publicProfile = await request(`query($id:ID!){userProfile(userId:$id){id name bio recentRatings { note } reviews { text author { id name } }}}`, { id: userIds[0] }, userIds[1]);
    assert.deepEqual((publicProfile.data!.userProfile as { recentRatings: unknown[] }).recentRatings, []);
    assert(!JSON.stringify(publicProfile).includes("private-note-sentinel"));
    assert(!JSON.stringify(publicProfile).includes("example.test"));

    const updated = await request(`mutation($id:ID!){updateMovieProgress(movieId:$id,input:{personalRating:5}){personalRating}}`, { id: movieIds[0] });
    assert.equal(updated.errors, undefined);
    const revised = (await request(feedbackQuery, { id: externalId })).data!.movieFeedback as { averageRating: number; reviews: { author: { id: string }; rating: number }[] };
    assert.equal(revised.averageRating, 5.5);
    assert.equal(revised.reviews.find((review) => review.author.id === userIds[0])?.rating, 5);
    await request(`mutation($id:ID!){deleteReview(id:$id)}`, { id: firstReview.id });
    const removed = (await request(feedbackQuery, { id: externalId })).data!.movieFeedback as { reviewCount: number; ratingCount: number };
    assert.deepEqual([removed.reviewCount, removed.ratingCount], [1, 2]);

    for (const userId of userIds.slice(0, 2)) {
      for (const [index, value] of [[0, 9], [1, 8]]) await prisma.userMovie.upsert({
        where: { userId_movieId: { userId, movieId: movieIds[index] } },
        create: { userId, movieId: movieIds[index], personalRating: value }, update: { personalRating: value }
      });
    }
    await prisma.userMovie.create({ data: { userId: userIds[1], movieId: movieIds[2], personalRating: 9 } });
    const recommended = await request(`query{recommendations{movie{id} mode ratingCount viewerRating}}`);
    const items = recommended.data!.recommendations as { movie: { id: string }; mode: string }[];
    assert.equal(items.find((item) => item.movie.id === movieIds[2])?.mode, "SIMILAR_TASTES");
    assert(!items.some((item) => [movieIds[0], movieIds[1]].includes(item.movie.id)));

    const unauthenticated = { ...context(userIds[0]), getUserId: async () => { throw new GraphQLError("Login required", { extensions: { code: "UNAUTHENTICATED" } }); } };
    const denied = await server.executeOperation({ query: `mutation{updateProfile(input:{name:"Hijack"}){id}}` }, { contextValue: unauthenticated });
    assert.equal(denied.body.kind, "single");
    if (denied.body.kind === "single") assert.equal(denied.body.singleResult.errors?.[0].extensions?.code, "UNAUTHENTICATED");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.movie.deleteMany({ where: { id: { in: movieIds } } });
    await server.stop();
    await prisma.$disconnect();
  }
});
