import { Prisma, WatchStatus } from "@prisma/client";
import { GraphQLError } from "graphql";
import { prisma } from "../db/prisma.js";
import { movieApiService } from "../services/movieApi.js";
import { rankRecommendations } from "../services/recommendations.js";
import type { GraphQLContext } from "./context.js";
import { asStringArray, dateToString, mapMovie, mapUserMovie } from "./mappers.js";

const reviewInclude = { userMovie: { include: { user: true, movie: true } } } satisfies Prisma.ReviewInclude;
type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

function mapReview(review: ReviewWithRelations) {
  return {
    id: review.id,
    text: review.text,
    hasSpoilers: review.hasSpoilers,
    rating: review.userMovie.personalRating,
    author: { id: review.userMovie.user.id, name: review.userMovie.user.name },
    movie: mapMovie(review.userMovie.movie),
    createdAt: dateToString(review.createdAt),
    updatedAt: dateToString(review.updatedAt)
  };
}

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

export async function getRatingRecommendations(userId: string) {
  const [own, community, collectionMovies] = await Promise.all([
    prisma.userMovie.findMany({ where: { userId }, include: { movie: true } }),
    prisma.userMovie.findMany({
      where: { userId: { not: userId }, personalRating: { not: null } },
      include: { movie: true }, orderBy: { updatedAt: "desc" }, take: 10000
    }),
    prisma.collectionMovie.findMany({ where: { collection: { userId } }, select: { movieId: true, movie: { select: { externalId: true } } }, distinct: ["movieId"] })
  ]);
  const entries = (items: typeof own) => items.map((entry) => ({
    userId: entry.userId, movieId: entry.movieId, personalRating: entry.personalRating,
    genres: asStringArray(entry.movie.genres)
  }));
  const movies = new Map(community.map((entry) => [entry.movieId, entry.movie]));
  const ownIds = new Set(own.map((entry) => entry.movieId));
  const savedEntries = [...entries(own), ...collectionMovies.filter((entry) => !ownIds.has(entry.movieId)).map((entry) => ({
    userId, movieId: entry.movieId, personalRating: null, genres: []
  }))];
  const scores = rankRecommendations(savedEntries, entries(community));
  const totals = scores.length ? await prisma.userMovie.groupBy({
    by: ["movieId"], where: { movieId: { in: scores.map((entry) => entry.movieId) }, personalRating: { not: null } },
    _avg: { personalRating: true }, _count: { personalRating: true }
  }) : [];
  const ranked = scores.map((recommendation) => ({
    ...recommendation,
    viewerRating: Number((totals.find((total) => total.movieId === recommendation.movieId)?._avg.personalRating ?? recommendation.viewerRating).toFixed(1)),
    ratingCount: totals.find((total) => total.movieId === recommendation.movieId)?._count.personalRating ?? recommendation.ratingCount,
    movie: { ...mapMovie(movies.get(recommendation.movieId)!), mediaType: movies.get(recommendation.movieId)!.mediaType ?? "movie" },
    sourceUsers: [], ratingSource: "WMWU"
  }));
  if (ranked.length >= 12) return ranked;

  const favorites = own.filter((entry) => (entry.personalRating ?? 0) >= 7 && /^tmdb:(movie|tv):[0-9]+$/.test(entry.movie.externalId))
    .sort((a, b) => (b.personalRating ?? 0) - (a.personalRating ?? 0)).slice(0, 2);
  const responses = await Promise.allSettled([
    ...favorites.map(async (entry) => ({
      movies: await movieApiService.getRecommendedMovies(entry.movie.externalId),
      reason: `Потому что вы высоко оценили «${entry.movie.titleRu || entry.movie.titleEn || entry.movie.originalTitle || "этот фильм"}».`,
      mode: "PERSONAL_RATINGS"
    })),
    movieApiService.getPopularMovies().then((movies) => ({ movies, reason: "Популярное кино с хорошими оценками зрителей TMDB.", mode: "COMMUNITY" }))
  ]);
  const excluded = new Set([
    ...own.map((entry) => entry.movie.externalId), ...collectionMovies.map((entry) => entry.movie.externalId),
    ...ranked.map((entry) => entry.movie.externalId)
  ]);
  const discoveries = [];
  for (const response of responses) {
    if (response.status !== "fulfilled") continue;
    const sorted = [...response.value.movies].sort((a, b) =>
      ((b.rating ?? 0) - 1.5 / Math.sqrt(b.ratingVotes ?? 1)) - ((a.rating ?? 0) - 1.5 / Math.sqrt(a.ratingVotes ?? 1))
    );
    for (const movie of sorted) {
      if (excluded.has(movie.externalId)) continue;
      excluded.add(movie.externalId);
      discoveries.push({
        movie, score: movie.rating ?? 0, reason: response.value.reason, mode: response.value.mode,
        viewerRating: movie.rating ?? 0, ratingCount: movie.ratingVotes ?? 0, sourceUsers: [], ratingSource: "TMDB"
      });
    }
  }
  return [...ranked, ...discoveries.slice(0, 12 - ranked.length)];
}

async function getProfile(userId: string, includePrivate: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const [movieCount, watchedCount, ratedCount, reviewCount, collectionsCount, ratings, reviews] = await Promise.all([
    prisma.userMovie.count({ where: { userId } }),
    prisma.userMovie.count({ where: { userId, status: { in: [WatchStatus.WATCHED, WatchStatus.REWATCH] } } }),
    prisma.userMovie.count({ where: { userId, personalRating: { not: null } } }),
    prisma.review.count({ where: { userMovie: { userId } } }),
    prisma.collection.count({ where: { userId, title: { not: "Хочу посмотреть" } } }),
    includePrivate ? prisma.userMovie.findMany({
      where: { userId, personalRating: { not: null } },
      include: { user: true, movie: true }, orderBy: { updatedAt: "desc" }
    }) : Promise.resolve([]),
    prisma.review.findMany({
      where: { userMovie: { userId } }, include: reviewInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20
    })
  ]);
  const genres = new Map<string, number>();
  for (const entry of ratings) {
    if ((entry.personalRating ?? 0) < 7) continue;
    for (const genre of new Set(asStringArray(entry.movie.genres))) {
      genres.set(genre, (genres.get(genre) ?? 0) + entry.personalRating! - 6);
    }
  }
  return {
    id: user.id, name: user.name, bio: user.bio, createdAt: dateToString(user.createdAt),
    stats: { movieCount, watchedCount, ratedCount, reviewCount, collectionsCount },
    favoriteGenres: [...genres].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([genre]) => genre),
    recentRatings: ratings.slice(0, 8).map(mapUserMovie),
    reviews: reviews.map(mapReview)
  };
}

export const socialQueries = {
  recommendations: async (_: unknown, __: unknown, context: GraphQLContext) =>
    getRatingRecommendations(await context.getUserId()),
  myProfile: async (_: unknown, __: unknown, context: GraphQLContext) =>
    getProfile(await context.getUserId(), true),
  userProfile: async (_: unknown, { userId }: { userId: string }) => getProfile(userId, false),
  movieFeedback: async (
    _: unknown, { externalId, offset = 0 }: { externalId: string; offset?: number | null }, context: GraphQLContext
  ) => {
    const pageOffset = offset ?? 0;
    if (!Number.isInteger(pageOffset) || pageOffset < 0) badInput("Некорректная страница отзывов.");
    const user = await context.getCurrentUser();
    const movieWhere = { movie: { externalId } };
    const reviewWhere = { userMovie: movieWhere };
    const [ratingStats, buckets, reviewCount, reviews, own] = await Promise.all([
      prisma.userMovie.aggregate({ where: movieWhere, _avg: { personalRating: true }, _count: { personalRating: true } }),
      prisma.userMovie.groupBy({
        by: ["personalRating"], where: { ...movieWhere, personalRating: { not: null } }, _count: { _all: true }
      }),
      prisma.review.count({ where: reviewWhere }),
      prisma.review.findMany({
        where: reviewWhere, include: reviewInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: pageOffset, take: 11
      }),
      user ? prisma.userMovie.findFirst({
        where: { ...movieWhere, userId: user.id }, include: { review: { include: reviewInclude } }
      }) : Promise.resolve(null)
    ]);
    return {
      averageRating: ratingStats._avg.personalRating === null ? null : Number(ratingStats._avg.personalRating.toFixed(1)),
      ratingCount: ratingStats._count.personalRating, reviewCount,
      distribution: Array.from({ length: 10 }, (_, index) => ({
        rating: index + 1, count: buckets.find((bucket) => bucket.personalRating === index + 1)?._count._all ?? 0
      })),
      reviews: reviews.slice(0, 10).map(mapReview), hasMore: reviews.length > 10,
      myReview: own?.review ? mapReview(own.review) : null, myRating: own?.personalRating ?? null
    };
  }
};

export const socialMutations = {
  updateProfile: async (_: unknown, { input }: { input: { name: string; bio?: string | null } }, context: GraphQLContext) => {
    const userId = await context.getUserId();
    const name = input.name.trim();
    const bio = input.bio === undefined ? undefined : input.bio?.trim() || null;
    if (!name || name.length > 60) badInput("Имя должно содержать от 1 до 60 символов.");
    if (bio && bio.length > 500) badInput("Описание должно быть не длиннее 500 символов.");
    await prisma.user.update({ where: { id: userId }, data: { name, ...(bio !== undefined ? { bio } : {}) } });
    return getProfile(userId, true);
  },
  publishReview: async (
    _: unknown,
    { externalId, input }: { externalId: string; input: { rating: number; text: string; hasSpoilers: boolean } },
    context: GraphQLContext
  ) => {
    const userId = await context.getUserId();
    const text = input.text.trim();
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) badInput("Оценка должна быть от 1 до 10.");
    if (text.length < 10 || text.length > 4000) badInput("Отзыв должен содержать от 10 до 4000 символов.");
    const existing = await prisma.movie.findUnique({ where: { externalId } });
    const details = existing ? null : await movieApiService.getMovieDetails(externalId);
    if (!existing && !details) throw new GraphQLError("Фильм не найден.", { extensions: { code: "NOT_FOUND" } });

    const review = await prisma.$transaction(async (tx) => {
      const movie = existing ?? await tx.movie.upsert({
        where: { externalId }, update: {},
        create: {
          externalId, titleRu: details!.titleRu, titleEn: details!.titleEn, originalTitle: details!.originalTitle,
          year: details!.year, posterUrl: details!.posterUrl, rating: details!.rating, description: details!.description,
          mediaType: details!.mediaType, country: details!.country, genres: details!.genres,
          duration: details!.duration, actors: details!.actors
        }
      });
      const entry = await tx.userMovie.upsert({
        where: { userId_movieId: { userId, movieId: movie.id } },
        update: { personalRating: input.rating },
        create: { userId, movieId: movie.id, personalRating: input.rating }
      });
      const createdAt = new Date();
      return tx.review.upsert({
        where: { userMovieId: entry.id },
        update: { text, hasSpoilers: input.hasSpoilers },
        create: { userMovieId: entry.id, text, hasSpoilers: input.hasSpoilers, createdAt, updatedAt: createdAt }, include: reviewInclude
      });
    });
    return mapReview(review);
  },
  deleteReview: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
    const userId = await context.getUserId();
    const deleted = await prisma.review.deleteMany({ where: { id, userMovie: { userId } } });
    if (!deleted.count) throw new GraphQLError("Отзыв не найден.", { extensions: { code: "NOT_FOUND" } });
    return true;
  }
};
