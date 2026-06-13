import { Prisma, WatchStatus, type Collection, type Movie, type User, type UserMovie } from "@prisma/client";
import { GraphQLError } from "graphql";
import {
  createSession,
  deleteSessionToken,
  hashPassword,
  normalizeEmail,
  type SessionUser,
  validatePassword,
  verifyPassword
} from "../auth.js";
import { config } from "../config.js";
import { prisma } from "../db/prisma.js";
import {
  movieApiService,
  type MovieFiltersInput,
  type MovieSearchResult,
  type MovieSortInput
} from "../services/movieApi.js";

type Context = {
  sessionToken: string | null;
  getCurrentUser: () => Promise<SessionUser | null>;
  getUserId: () => Promise<string>;
  setSessionCookie: (token: string, expiresAt: Date) => void;
  clearSessionCookie: () => void;
};

type CollectionWithMovies = Collection & {
  user: User;
  collectionMovies: { createdAt: Date; movie: Movie }[];
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
    createdAt: dateToString(user.createdAt),
    updatedAt: dateToString(user.updatedAt)
  };
}

function mapCollection(collection: CollectionWithMovies, filters?: MovieFiltersInput | null, sort?: MovieSortInput | null) {
  const movies = filterAndSortMovieEntries(
    collection.collectionMovies.map(({ createdAt, movie }) => ({ addedAt: createdAt, movie: mapMovie(movie) })),
    filters,
    sort
  ).map(({ movie }) => movie);

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

type MappedMovie = ReturnType<typeof mapMovie>;

type MovieEntry = {
  addedAt: Date;
  movie: MappedMovie;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function includesText(value: string | null | undefined, query: string) {
  return normalizeText(value).includes(normalizeText(query));
}

function getMovieTitle(movie: Pick<MappedMovie, "titleRu" | "titleEn" | "originalTitle">) {
  return movie.titleRu || movie.titleEn || movie.originalTitle || "";
}

function matchesMovieFilters(movie: MappedMovie, filters?: MovieFiltersInput | null) {
  if (!filters) {
    return true;
  }

  if (filters.yearFrom !== undefined && filters.yearFrom !== null && (movie.year ?? 0) < filters.yearFrom) {
    return false;
  }

  if (filters.yearTo !== undefined && filters.yearTo !== null && (movie.year ?? 9999) > filters.yearTo) {
    return false;
  }

  if (filters.mediaType && movie.mediaType !== filters.mediaType) {
    return false;
  }

  if (filters.ratingFrom !== undefined && filters.ratingFrom !== null && (movie.rating ?? 0) < filters.ratingFrom) {
    return false;
  }

  const genreFilter = filters.genre;
  if (genreFilter && !movie.genres.some((genre) => includesText(genre, genreFilter))) {
    return false;
  }

  const countryFilter = filters.country;
  if (countryFilter && !includesText(movie.country, countryFilter)) {
    return false;
  }

  return true;
}

function filterAndSortMovieEntries(entries: MovieEntry[], filters?: MovieFiltersInput | null, sort?: MovieSortInput | null) {
  const filtered = entries.filter(({ movie }) => matchesMovieFilters(movie, filters));
  const sortInput = sort ?? { field: "ADDED_AT", direction: "DESC" as const };
  const direction = sortInput.direction === "ASC" ? 1 : -1;

  return [...filtered].sort((left, right) => {
    if (sortInput.field === "TITLE") {
      return getMovieTitle(left.movie).localeCompare(getMovieTitle(right.movie), "ru") * direction;
    }

    if (sortInput.field === "YEAR") {
      return ((left.movie.year ?? 0) - (right.movie.year ?? 0)) * direction;
    }

    if (sortInput.field === "RATING") {
      return ((left.movie.rating ?? 0) - (right.movie.rating ?? 0)) * direction;
    }

    return (left.addedAt.getTime() - right.addedAt.getTime()) * direction;
  });
}

function mapSmartCollection(id: string, title: string, description: string, entries: MovieEntry[]) {
  const movies = entries.map(({ movie }) => movie);

  return {
    id,
    title,
    description,
    movies,
    movieCount: movies.length
  };
}

function getTasteWeight(entry: Pick<UserMovie, "personalRating" | "status">) {
  if (entry.personalRating !== null && entry.personalRating !== undefined) {
    return entry.personalRating >= 7 ? entry.personalRating / 10 : 0;
  }

  if (entry.status === WatchStatus.REWATCH) {
    return 0.78;
  }

  if (entry.status === WatchStatus.WATCHED) {
    return 0.62;
  }

  return 0;
}

function getRecommendationReason(sourceUsers: Set<string>) {
  const users = Array.from(sourceUsers);

  if (users.length === 1) {
    return `${users[0]} оценил(а) фильм близко к вашему вкусу.`;
  }

  return `Понравилось ${users.length} пользователям со схожим вкусом.`;
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

function requireName(name: string) {
  const normalized = name.trim();

  if (!normalized) {
    throw new GraphQLError("Имя обязательно.", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }

  return normalized;
}

function requireEmail(email: string) {
  const normalized = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new GraphQLError("Введите корректный email.", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }

  return normalized;
}

async function startUserSession(userId: string, context: Context) {
  const session = await createSession(userId);
  context.setSessionCookie(session.token, session.expiresAt);
}

async function getSavedMovieEntries(userId: string) {
  await backfillUserMoviesFromCollections(userId);
  const userMovies = await prisma.userMovie.findMany({
    where: { userId },
    include: {
      user: true,
      movie: true
    }
  });

  return userMovies.map((entry) => ({
    addedAt: entry.updatedAt,
    movie: mapMovie(entry.movie),
    userMovie: entry
  }));
}

async function claimMockUserData(userId: string) {
  const mockUser = await prisma.user.findUnique({
    where: { email: config.mockUserEmail }
  });

  if (!mockUser || mockUser.id === userId) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    const [mockWatchlist, targetWatchlist] = await Promise.all([
      tx.collection.findFirst({
        where: { userId: mockUser.id, title: WATCHLIST_TITLE },
        include: { collectionMovies: true }
      }),
      tx.collection.findFirst({
        where: { userId, title: WATCHLIST_TITLE },
        include: { collectionMovies: true }
      })
    ]);

    if (mockWatchlist && targetWatchlist) {
      for (const item of mockWatchlist.collectionMovies) {
        await tx.collectionMovie.upsert({
          where: {
            collectionId_movieId: {
              collectionId: targetWatchlist.id,
              movieId: item.movieId
            }
          },
          update: {},
          create: {
            collectionId: targetWatchlist.id,
            movieId: item.movieId,
            createdAt: item.createdAt
          }
        });
      }

      await tx.collection.delete({ where: { id: mockWatchlist.id } });
    }

    await tx.collection.updateMany({
      where: { userId: mockUser.id },
      data: { userId }
    });

    const mockUserMovies = await tx.userMovie.findMany({
      where: { userId: mockUser.id }
    });

    for (const entry of mockUserMovies) {
      await tx.userMovie.upsert({
        where: {
          userId_movieId: {
            userId,
            movieId: entry.movieId
          }
        },
        update: {
          status: entry.status,
          personalRating: entry.personalRating,
          note: entry.note,
          watchedAt: entry.watchedAt
        },
        create: {
          userId,
          movieId: entry.movieId,
          status: entry.status,
          personalRating: entry.personalRating,
          note: entry.note,
          watchedAt: entry.watchedAt,
          createdAt: entry.createdAt
        }
      });
    }

    await tx.userMovie.deleteMany({
      where: { userId: mockUser.id }
    });
  });

  return true;
}

async function getTasteRecommendations(userId: string) {
  await backfillUserMoviesFromCollections(userId);

  const currentEntries = await prisma.userMovie.findMany({
    where: { userId },
    include: { movie: true }
  });
  const currentMovieIds = new Set(currentEntries.map((entry) => entry.movieId));
  const currentLikedEntries = currentEntries
    .map((entry) => ({ entry, weight: getTasteWeight(entry) }))
    .filter(({ weight }) => weight > 0);

  if (currentLikedEntries.length === 0) {
    return [];
  }

  const currentLikedIds = new Set(currentLikedEntries.map(({ entry }) => entry.movieId));
  const currentWeightByMovieId = new Map(currentLikedEntries.map(({ entry, weight }) => [entry.movieId, weight]));
  const overlappingEntries = await prisma.userMovie.findMany({
    where: {
      userId: { not: userId },
      movieId: { in: Array.from(currentLikedIds) }
    },
    include: { user: true }
  });
  const similarityByUserId = new Map<string, { score: number; userName: string }>();

  for (const entry of overlappingEntries) {
    const otherWeight = getTasteWeight(entry);

    if (otherWeight <= 0) {
      continue;
    }

    const currentWeight = currentWeightByMovieId.get(entry.movieId) ?? 0;
    const existing = similarityByUserId.get(entry.userId) ?? { score: 0, userName: entry.user.name };
    existing.score += currentWeight * otherWeight;
    similarityByUserId.set(entry.userId, existing);
  }

  const similarUserIds = Array.from(similarityByUserId.entries())
    .filter(([, similarity]) => similarity.score > 0)
    .sort(([, left], [, right]) => right.score - left.score)
    .slice(0, 12)
    .map(([similarUserId]) => similarUserId);

  if (similarUserIds.length === 0) {
    return [];
  }

  const candidateEntries = await prisma.userMovie.findMany({
    where: {
      userId: { in: similarUserIds },
      movieId: { notIn: Array.from(currentMovieIds) }
    },
    include: {
      user: true,
      movie: true
    }
  });
  const candidateByMovieId = new Map<
    string,
    {
      movie: Movie;
      score: number;
      sourceUsers: Set<string>;
    }
  >();

  for (const entry of candidateEntries) {
    const tasteWeight = getTasteWeight(entry);

    if (tasteWeight <= 0) {
      continue;
    }

    const similarity = similarityByUserId.get(entry.userId)?.score ?? 0;
    const existing = candidateByMovieId.get(entry.movieId) ?? {
      movie: entry.movie,
      score: 0,
      sourceUsers: new Set<string>()
    };
    existing.score += similarity * tasteWeight;
    existing.sourceUsers.add(entry.user.name);
    candidateByMovieId.set(entry.movieId, existing);
  }

  return Array.from(candidateByMovieId.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map((candidate) => ({
      movie: mapMovie(candidate.movie),
      score: Number(candidate.score.toFixed(3)),
      reason: getRecommendationReason(candidate.sourceUsers),
      sourceUsers: Array.from(candidate.sourceUsers).slice(0, 3)
    }));
}

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: Context) => {
      const user = await context.getCurrentUser();
      return user ? mapUser(user as User) : null;
    },
    searchMovies: async (
      _: unknown,
      { query, filters, sort }: { query: string; filters?: MovieFiltersInput | null; sort?: MovieSortInput | null }
    ) => movieApiService.searchMovies(query, filters, sort),
    movieDetails: async (_: unknown, { id }: { id: string }) => movieApiService.getMovieDetails(id),
    relatedMovies: async (_: unknown, { id }: { id: string }) => movieApiService.getRelatedMovieGroups(id),
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

      return collections.map((collection) => mapCollection(collection));
    },
    collection: async (
      _: unknown,
      { id, filters, sort }: { id: string; filters?: MovieFiltersInput | null; sort?: MovieSortInput | null },
      context: Context
    ) => {
      const userId = await context.getUserId();
      const collection = await prisma.collection.findFirst({
        where: { id, userId },
        include: collectionInclude
      });

      return collection ? mapCollection(collection, filters, sort) : null;
    },
    watchlist: async (
      _: unknown,
      { filters, sort }: { filters?: MovieFiltersInput | null; sort?: MovieSortInput | null },
      context: Context
    ) => {
      const userId = await context.getUserId();
      const collection = await getOrCreateWatchlist(userId);
      return mapCollection(collection, filters, sort);
    },
    savedMovies: async (
      _: unknown,
      {
        status,
        filters,
        sort
      }: { status?: WatchStatus | null; filters?: MovieFiltersInput | null; sort?: MovieSortInput | null },
      context: Context
    ) => {
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
      const sortedMovieIds = filterAndSortMovieEntries(
        savedMovies.map((entry) => ({ addedAt: entry.updatedAt, movie: mapMovie(entry.movie) })),
        filters,
        sort
      ).map(({ movie }) => movie.id);
      const savedMovieByMovieId = new Map(savedMovies.map((entry) => [entry.movieId, entry]));

      return sortedMovieIds
        .map((movieId) => savedMovieByMovieId.get(movieId))
        .filter((entry): entry is UserMovieWithRelations => Boolean(entry))
        .map(mapUserMovie);
    },
    smartCollections: async (_: unknown, __: unknown, context: Context) => {
      const userId = await context.getUserId();
      const savedEntries = await getSavedMovieEntries(userId);
      const collectionMovies = await prisma.collectionMovie.findMany({
        where: {
          collection: {
            userId,
            title: { not: WATCHLIST_TITLE }
          }
        },
        select: { movieId: true }
      });
      const moviesInCollections = new Set(collectionMovies.map(({ movieId }) => movieId));
      const entries = savedEntries.map(({ addedAt, movie }) => ({ addedAt, movie }));
      const ratingSort = { field: "RATING", direction: "DESC" } satisfies MovieSortInput;

      return [
        mapSmartCollection(
          "nineties",
          "Фильмы 90-х",
          "Сохраненные фильмы, вышедшие с 1990 по 1999 год.",
          filterAndSortMovieEntries(entries, { yearFrom: 1990, yearTo: 1999 }, { field: "YEAR", direction: "DESC" })
        ),
        mapSmartCollection(
          "thrillers-high-rating",
          "Триллеры с рейтингом выше 7",
          "Напряженные фильмы и сериалы с высоким рейтингом.",
          filterAndSortMovieEntries(entries, { genre: "триллер", ratingFrom: 7 }, ratingSort)
        ),
        mapSmartCollection(
          "series",
          "Сериалы",
          "Все сохраненные сериалы в одном автоматическом списке.",
          filterAndSortMovieEntries(entries, { mediaType: "series" }, { field: "TITLE", direction: "ASC" })
        ),
        mapSmartCollection(
          "russian-cinema",
          "Русское кино",
          "Фильмы и сериалы из России.",
          filterAndSortMovieEntries(entries, { country: "россия" }, { field: "YEAR", direction: "DESC" })
        ),
        mapSmartCollection(
          "without-collection",
          "Фильмы без коллекции",
          "Сохраненные фильмы, которые еще не лежат ни в одной тематической подборке.",
          filterAndSortMovieEntries(
            entries.filter(({ movie }) => !moviesInCollections.has(movie.id)),
            null,
            { field: "ADDED_AT", direction: "DESC" }
          )
        )
      ];
    },
    tasteRecommendations: async (_: unknown, __: unknown, context: Context) => {
      const userId = await context.getUserId();
      return getTasteRecommendations(userId);
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
    register: async (
      _: unknown,
      { input }: { input: { name: string; email: string; password: string } },
      context: Context
    ) => {
      const name = requireName(input.name);
      const email = requireEmail(input.email);

      try {
        validatePassword(input.password);
      } catch (error) {
        throw new GraphQLError(error instanceof Error ? error.message : "Некорректный пароль.", {
          extensions: { code: "BAD_USER_INPUT" }
        });
      }

      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing) {
        throw new GraphQLError("Пользователь с таким email уже существует.", {
          extensions: { code: "BAD_USER_INPUT" }
        });
      }

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await hashPassword(input.password)
        }
      });
      await startUserSession(user.id, context);

      return { user: mapUser(user) };
    },
    login: async (_: unknown, { input }: { input: { email: string; password: string } }, context: Context) => {
      const email = requireEmail(input.email);
      const user = await prisma.user.findUnique({ where: { email } });
      const isPasswordValid = await verifyPassword(input.password, user?.passwordHash);

      if (!user || !isPasswordValid) {
        throw new GraphQLError("Неверный email или пароль.", {
          extensions: { code: "UNAUTHENTICATED" }
        });
      }

      await startUserSession(user.id, context);
      return { user: mapUser(user) };
    },
    logout: async (_: unknown, __: unknown, context: Context) => {
      await deleteSessionToken(context.sessionToken);
      context.clearSessionCookie();
      return true;
    },
    claimMockUserData: async (_: unknown, __: unknown, context: Context) => {
      const userId = await context.getUserId();
      return claimMockUserData(userId);
    },
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
