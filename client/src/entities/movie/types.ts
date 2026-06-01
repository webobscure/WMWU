export type MediaType = "movie" | "series";

export type MovieSearchResult = {
  id: string;
  externalId: string;
  titleRu?: string | null;
  titleEn?: string | null;
  originalTitle?: string | null;
  year?: number | null;
  posterUrl?: string | null;
  rating?: number | null;
  description?: string | null;
  mediaType: MediaType;
};

export type MovieDetails = MovieSearchResult & {
  country?: string | null;
  genres: string[];
  duration?: number | null;
  actors: string[];
};

export type PersistedMovie = MovieDetails & {
  id: string;
  createdAt: string;
};

export type MovieInput = {
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

export type WatchStatus = "WANT_TO_WATCH" | "WATCHING" | "WATCHED" | "DROPPED" | "REWATCH";

export type UserMovie = {
  id: string;
  movie: PersistedMovie;
  status: WatchStatus;
  personalRating?: number | null;
  note?: string | null;
  watchedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const watchStatusLabels: Record<WatchStatus, string> = {
  WANT_TO_WATCH: "Хочу посмотреть",
  WATCHING: "Смотрю",
  WATCHED: "Посмотрел",
  DROPPED: "Бросил",
  REWATCH: "Пересмотреть"
};

export function getMovieTitle(movie: Pick<MovieSearchResult, "titleRu" | "titleEn" | "originalTitle">) {
  return movie.titleRu || movie.titleEn || movie.originalTitle || "Без названия";
}

export function getMediaTypeLabel(type?: string | null) {
  return type === "series" ? "Сериал" : "Фильм";
}

export function toMovieInput(movie: MovieSearchResult | MovieDetails): MovieInput {
  return {
    externalId: movie.externalId,
    titleRu: movie.titleRu,
    titleEn: movie.titleEn,
    originalTitle: movie.originalTitle,
    year: movie.year,
    posterUrl: movie.posterUrl,
    rating: movie.rating,
    description: movie.description,
    mediaType: movie.mediaType,
    country: "country" in movie ? movie.country : undefined,
    genres: "genres" in movie ? movie.genres : undefined,
    duration: "duration" in movie ? movie.duration : undefined,
    actors: "actors" in movie ? movie.actors : undefined
  };
}
