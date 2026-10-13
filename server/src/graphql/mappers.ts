import type { Movie, Prisma, User, UserMovie } from "@prisma/client";

export function dateToString(value: Date) {
  return value.toISOString();
}

export function asStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function mapMovie(movie: Movie) {
  return {
    ...movie,
    genres: asStringArray(movie.genres),
    actors: asStringArray(movie.actors),
    createdAt: dateToString(movie.createdAt)
  };
}

export function mapUser(user: Pick<User, "id" | "name" | "email" | "createdAt" | "updatedAt">) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: dateToString(user.createdAt),
    updatedAt: dateToString(user.updatedAt)
  };
}

export function mapUserMovie(userMovie: UserMovie & { user: User; movie: Movie }) {
  return {
    ...userMovie,
    user: mapUser(userMovie.user),
    movie: mapMovie(userMovie.movie),
    watchedAt: userMovie.watchedAt ? dateToString(userMovie.watchedAt) : null,
    createdAt: dateToString(userMovie.createdAt),
    updatedAt: dateToString(userMovie.updatedAt)
  };
}
