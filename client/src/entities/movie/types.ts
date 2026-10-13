export type MediaType = "movie" | "series";

export type MovieTrailer = {
  id: string;
  name: string;
  key: string;
  language: string | null;
  official: boolean;
  type: "Trailer" | "Teaser";
};

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
  movie: MovieSearchResult;
  score: number;
  reason: string;
  sourceUsers: string[];
  mode: "SIMILAR_TASTES" | "GENRES" | "COMMUNITY" | "PERSONAL_RATINGS";
  viewerRating: number;
  ratingCount: number;
  ratingSource: "WMWU" | "TMDB";
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

export type Review = {
  id: string;
  author: { id: string; name: string };
  movie: PersistedMovie;
  rating: number | null;
  text: string;
  hasSpoilers: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MovieFeedback = {
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
  distribution: { rating: number; count: number }[];
  reviews: Review[];
  hasMore: boolean;
  myReview: Review | null;
  myRating: number | null;
};

export type Profile = {
  id: string;
  name: string;
  bio: string | null;
  createdAt: string;
  stats: { movieCount: number; watchedCount: number; ratedCount: number; reviewCount: number; collectionsCount: number };
  favoriteGenres: string[];
  recentRatings: UserMovie[];
  reviews: Review[];
};
