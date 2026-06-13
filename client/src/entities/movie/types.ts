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
  country?: string | null;
  genres: string[];
  actors: string[];
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

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type MovieFilters = {
  yearFrom?: number | null;
  yearTo?: number | null;
  genre?: string | null;
  mediaType?: MediaType | null;
  ratingFrom?: number | null;
  country?: string | null;
};

export type MovieSortField = "ADDED_AT" | "RATING" | "YEAR" | "TITLE";
export type SortDirection = "ASC" | "DESC";

export type MovieSort = {
  field: MovieSortField;
  direction: SortDirection;
};

export type RelatedMovieGroup = {
  id: string;
  title: string;
  movies: MovieSearchResult[];
};

export type SmartCollection = {
  id: string;
  title: string;
  description: string;
  movieCount: number;
  movies: PersistedMovie[];
};

export type TasteRecommendation = {
  movie: PersistedMovie;
  score: number;
  reason: string;
  sourceUsers: string[];
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
