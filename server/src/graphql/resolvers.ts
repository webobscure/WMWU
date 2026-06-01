import { Prisma, WatchStatus, type Collection, type Movie, type User, type UserMovie } from "@prisma/client";
import { GraphQLError } from "graphql";
import { config } from "../config.js";
import { prisma } from "../db/prisma.js";
import { movieApiService } from "../services/movieApi.js";

type Context = {
  getUserId: () => Promise<string>;
};

type CollectionWithMovies = Collection & {
  user: User;
  collectionMovies: { movie: Movie }[];
};

type MovieInput = {
  externalId: string;
  titleRu?: string | null;
  titleEn?: string | null;
  originalTitle?: string | null;
  year?: number | null;
  posterUrl?: string | null;
  rating?: number | null;
  description?: string | null;
  mediaType?: string | null;
  country?: string | null;
  genres?: string[] | null;
  duration?: number | null;
  actors?: string[] | null;
};

type UserMovieWithRelations = UserMovie & {
  user: User;
  movie: Movie;
};

type UpdateMovieProgressInput = {
  status?: WatchStatus | null;
  personalRating?: number | null;
  note?: string | null;
  watchedAt?: string | null;
};

const WATCHLIST_TITLE = "Хочу посмотреть";
const WATCHLIST_DESCRIPTION = "Фильмы и сериалы, которые хочется посмотреть позже.";

function dateToString(value: Date) {
  return value.toISOString();
}

function asStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapMovie(movie: Movie) {
  return {
    ...movie,
    genres: asStringArray(movie.genres),
    actors: asStringArray(movie.actors),
    createdAt: dateToString(movie.createdAt)
  };
}

function mapUser(user: User) {
  return {
    ...user,
    createdAt: dateToString(user.createdAt)
  };
}

function mapCollection(collection: CollectionWithMovies) {
  const movies = collection.collectionMovies.map(({ movie }) => mapMovie(movie));

  return {
    ...collection,
    user: mapUser(collection.user),
    movies,
    movieCount: movies.length,
    createdAt: dateToString(collection.createdAt),
    updatedAt: dateToString(collection.updatedAt)
  };
}

function mapUserMovie(userMovie: UserMovieWithRelations) {
  return {
    ...userMovie,
    user: mapUser(userMovie.user),
    movie: mapMovie(userMovie.movie),
    watchedAt: userMovie.watchedAt ? dateToString(userMovie.watchedAt) : null,
    createdAt: dateToString(userMovie.createdAt),
    updatedAt: dateToString(userMovie.updatedAt)
  };
}

const collectionInclude = {
  user: true,
  collectionMovies: {
    orderBy: { createdAt: "desc" },
    include: { movie: true }
  }
} satisfies Prisma.CollectionInclude;

const watchlistInclude = {
  user: true,
  collectionMovies: {
    orderBy: { createdAt: "asc" },
    include: { movie: true }
  }
} satisfies Prisma.CollectionInclude;

async function getCollectionForUser(collectionId: string, userId: string) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: collectionInclude
  });

  if (!collection) {
    throw new GraphQLError("Коллекция не найдена.", {
      extensions: { code: "NOT_FOUND" }
    });
  }

  return collection;
}

async function getOrCreateWatchlist(userId: string) {
  const existing = await prisma.collection.findFirst({
    where: {
      userId,
      title: WATCHLIST_TITLE
    },
    orderBy: { createdAt: "asc" },
    include: watchlistInclude
  });

  if (existing) {
    return existing;
  }

  return prisma.collection.create({
    data: {
      title: WATCHLIST_TITLE,
      description: WATCHLIST_DESCRIPTION,
      tags: ["watchlist"],
      userId
    },
    include: watchlistInclude
  });
}

async function upsertMovieFromInput(movieInput: MovieInput) {
  return prisma.movie.upsert({
    where: { externalId: movieInput.externalId },
    update: {
      titleRu: movieInput.titleRu,
      titleEn: movieInput.titleEn,
      originalTitle: movieInput.originalTitle,
      year: movieInput.year,
      posterUrl: movieInput.posterUrl,
      rating: movieInput.rating,
      description: movieInput.description,
      mediaType: movieInput.mediaType,
      country: movieInput.country,
      genres: movieInput.genres ?? Prisma.JsonNull,
      duration: movieInput.duration,
      actors: movieInput.actors ?? Prisma.JsonNull
    },
    create: {
      externalId: movieInput.externalId,
      titleRu: movieInput.titleRu,
      titleEn: movieInput.titleEn,
      originalTitle: movieInput.originalTitle,
      year: movieInput.year,
      posterUrl: movieInput.posterUrl,
      rating: movieInput.rating,
      description: movieInput.description,
      mediaType: movieInput.mediaType,
      country: movieInput.country,
      genres: movieInput.genres ?? Prisma.JsonNull,
      duration: movieInput.duration,
      actors: movieInput.actors ?? Prisma.JsonNull
    }
  });
}

async function addMovieToCollectionById(collectionId: string, movieInput: MovieInput) {
  const movie = await upsertMovieFromInput(movieInput);

  await prisma.collectionMovie.upsert({
    where: {
      collectionId_movieId: {
        collectionId,
        movieId: movie.id
      }
    },
    update: {},
    create: {
      collectionId,
      movieId: movie.id
    }
  });

  return movie;
}

async function ensureUserMovie(userId: string, movieId: string, status = WatchStatus.WANT_TO_WATCH) {
  return prisma.userMovie.upsert({
    where: {
      userId_movieId: {
        userId,
        movieId
      }
    },
    update: {},
    create: {
      userId,
      movieId,
      status
    },
    include: {
      user: true,
      movie: true
    }
  });
}

async function backfillUserMoviesFromCollections(userId: string) {
  const collectionMovies = await prisma.collectionMovie.findMany({
    where: {
      collection: {
        userId
      }
    },
    select: {
      movieId: true
    },
    distinct: ["movieId"]
  });

  await Promise.all(collectionMovies.map(({ movieId }) => ensureUserMovie(userId, movieId)));
}

function requireTitle(title: string) {
  const normalized = title.trim();

  if (!normalized) {
    throw new GraphQLError("Название коллекции обязательно.", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }

  return normalized;
}

function normalizeTags(tags?: string[] | null) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim().replace(/^#+/, "").toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

function normalizeProgressInput(input: UpdateMovieProgressInput) {
  if (input.personalRating !== undefined && input.personalRating !== null) {
    if (!Number.isInteger(input.personalRating) || input.personalRating < 1 || input.personalRating > 10) {
      throw new GraphQLError("Оценка должна быть целым числом от 1 до 10.", {
        extensions: { code: "BAD_USER_INPUT" }
      });
    }
  }

  return {
    ...(input.status !== undefined ? { status: input.status ?? WatchStatus.WANT_TO_WATCH } : {}),
    ...(input.personalRating !== undefined ? { personalRating: input.personalRating } : {}),
    ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
    ...(input.watchedAt !== undefined
      ? { watchedAt: input.watchedAt ? new Date(input.watchedAt) : null }
      : {})
  };
}

export async function getMockUser() {
  return prisma.user.upsert({
    where: { email: config.mockUserEmail },
    update: {},
    create: {
      email: config.mockUserEmail,
      name: "Demo User"
    }
  });
}

export const resolvers = {
  Query: {
    searchMovies: async (_: unknown, { query }: { query: string }) => movieApiService.searchMovies(query),
    movieDetails: async (_: unknown, { id }: { id: string }) => movieApiService.getMovieDetails(id),
    collections: async (_: unknown, __: unknown, context: Context) => {
      const userId = await context.getUserId();
      const collections = await prisma.collection.findMany({
        where: {
          userId,
          title: { not: WATCHLIST_TITLE }
        },
        orderBy: { updatedAt: "desc" },
        include: collectionInclude
      });

      return collections.map(mapCollection);
    },
    collection: async (_: unknown, { id }: { id: string }, context: Context) => {
      const userId = await context.getUserId();
      const collection = await prisma.collection.findFirst({
        where: { id, userId },
        include: collectionInclude
      });

      return collection ? mapCollection(collection) : null;
    },
    watchlist: async (_: unknown, __: unknown, context: Context) => {
      const userId = await context.getUserId();
      const collection = await getOrCreateWatchlist(userId);
      return mapCollection(collection);
    },
    savedMovies: async (_: unknown, { status }: { status?: WatchStatus | null }, context: Context) => {
      const userId = await context.getUserId();
      await backfillUserMoviesFromCollections(userId);
      const savedMovies = await prisma.userMovie.findMany({
        where: {
          userId,
          ...(status ? { status } : {})
        },
        orderBy: { updatedAt: "desc" },
        include: {
          user: true,
          movie: true
        }
      });

      return savedMovies.map(mapUserMovie);
    },
    movieProgress: async (_: unknown, { movieId }: { movieId: string }, context: Context) => {
      const userId = await context.getUserId();
      await backfillUserMoviesFromCollections(userId);
      const progress = await prisma.userMovie.findFirst({
        where: {
          userId,
          movieId
        },
        include: {
          user: true,
          movie: true
        }
      });

      return progress ? mapUserMovie(progress) : null;
    },
    movieProgressByExternalId: async (_: unknown, { externalId }: { externalId: string }, context: Context) => {
      const userId = await context.getUserId();
      await backfillUserMoviesFromCollections(userId);
      const progress = await prisma.userMovie.findFirst({
        where: {
          userId,
          movie: {
            externalId
          }
        },
        include: {
          user: true,
          movie: true
        }
      });

      return progress ? mapUserMovie(progress) : null;
    }
  },
  Mutation: {
    createCollection: async (
      _: unknown,
      { input }: { input: { title: string; description?: string | null; tags?: string[] | null } },
      context: Context
    ) => {
      const userId = await context.getUserId();
      const collection = await prisma.collection.create({
        data: {
          title: requireTitle(input.title),
          description: input.description?.trim() || null,
          tags: normalizeTags(input.tags),
          userId
        },
        include: collectionInclude
      });

      return mapCollection(collection);
    },
    updateCollection: async (
      _: unknown,
      { id, input }: { id: string; input: { title?: string | null; description?: string | null; tags?: string[] | null } },
      context: Context
    ) => {
      const userId = await context.getUserId();
      await getCollectionForUser(id, userId);

      const collection = await prisma.collection.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: requireTitle(input.title ?? "") } : {}),
          ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
          ...(input.tags !== undefined ? { tags: normalizeTags(input.tags) } : {})
        },
        include: collectionInclude
      });

      return mapCollection(collection);
    },
    deleteCollection: async (_: unknown, { id }: { id: string }, context: Context) => {
      const userId = await context.getUserId();
      await getCollectionForUser(id, userId);
      await prisma.collection.delete({ where: { id } });
      return true;
    },
    addMovieToCollection: async (
      _: unknown,
      { collectionId, movieInput }: { collectionId: string; movieInput: MovieInput },
      context: Context
    ) => {
      const userId = await context.getUserId();
      await getCollectionForUser(collectionId, userId);

      const movie = await addMovieToCollectionById(collectionId, movieInput);
      await ensureUserMovie(userId, movie.id);

      const collection = await getCollectionForUser(collectionId, userId);
      return mapCollection(collection);
    },
    removeMovieFromCollection: async (
      _: unknown,
      { collectionId, movieId }: { collectionId: string; movieId: string },
      context: Context
    ) => {
      const userId = await context.getUserId();
      await getCollectionForUser(collectionId, userId);

      await prisma.collectionMovie.deleteMany({
        where: {
          collectionId,
          movieId
        }
      });

      const collection = await getCollectionForUser(collectionId, userId);
      return mapCollection(collection);
    },
    addMovieToWatchlist: async (_: unknown, { movieInput }: { movieInput: MovieInput }, context: Context) => {
      const userId = await context.getUserId();
      const watchlist = await getOrCreateWatchlist(userId);
      const movie = await addMovieToCollectionById(watchlist.id, movieInput);
      await ensureUserMovie(userId, movie.id, WatchStatus.WANT_TO_WATCH);
      const updatedWatchlist = await getOrCreateWatchlist(userId);
      return mapCollection(updatedWatchlist);
    },
    removeMovieFromWatchlist: async (_: unknown, { movieId }: { movieId: string }, context: Context) => {
      const userId = await context.getUserId();
      const watchlist = await getOrCreateWatchlist(userId);

      await prisma.collectionMovie.deleteMany({
        where: {
          collectionId: watchlist.id,
          movieId
        }
      });

      const updatedWatchlist = await getOrCreateWatchlist(userId);
      return mapCollection(updatedWatchlist);
    },
    addMovieToLibrary: async (_: unknown, { movieInput }: { movieInput: MovieInput }, context: Context) => {
      const userId = await context.getUserId();
      const movie = await upsertMovieFromInput(movieInput);
      const progress = await ensureUserMovie(userId, movie.id);
      return mapUserMovie(progress);
    },
    updateMovieProgress: async (
      _: unknown,
      { movieId, input }: { movieId: string; input: UpdateMovieProgressInput },
      context: Context
    ) => {
      const userId = await context.getUserId();
      const existing = await prisma.userMovie.findFirst({
        where: {
          userId,
          movieId
        }
      });

      if (!existing) {
        throw new GraphQLError("Фильм еще не сохранен в библиотеку.", {
          extensions: { code: "NOT_FOUND" }
        });
      }

      const updated = await prisma.userMovie.update({
        where: { id: existing.id },
        data: normalizeProgressInput(input),
        include: {
          user: true,
          movie: true
        }
      });

      return mapUserMovie(updated);
    }
  }
};
