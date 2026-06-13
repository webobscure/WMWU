import { GraphQLError } from "graphql";
import { config } from "../config.js";

type TmdbMediaType = "movie" | "tv";

type TmdbSearchItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  overview?: string;
};

type TmdbSearchResponse = {
  results?: TmdbSearchItem[];
};

type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  overview?: string;
  runtime?: number;
  episode_run_time?: number[];
  production_countries?: { name: string }[];
  origin_country?: string[];
  genres?: { name: string }[];
  credits?: {
    cast?: { id?: number; name: string; order?: number }[];
  };
};

type TmdbCreditsResponse = {
  cast?: TmdbSearchItem[];
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
  mediaType: "movie" | "series";
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

export type MovieFiltersInput = {
  yearFrom?: number | null;
  yearTo?: number | null;
  genre?: string | null;
  mediaType?: string | null;
  ratingFrom?: number | null;
  country?: string | null;
};

export type MovieSortInput = {
  field: "ADDED_AT" | "RATING" | "YEAR" | "TITLE";
  direction: "ASC" | "DESC";
};

export type RelatedMovieGroup = {
  id: string;
  title: string;
  movies: MovieSearchResult[];
};

const imageBaseUrl = "https://image.tmdb.org/t/p/w500";

function parseYear(value?: string) {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function toExternalId(mediaType: TmdbMediaType, id: number | string) {
  return `tmdb:${mediaType}:${id}`;
}

function parseExternalId(externalId: string): { mediaType: TmdbMediaType; id: string } {
  const [, mediaType, id] = externalId.split(":");

  if ((mediaType !== "movie" && mediaType !== "tv") || !id) {
    throw new GraphQLError("Некорректный идентификатор фильма.", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }

  return { mediaType, id };
}

function getLocalizedTitle(item: TmdbSearchItem | TmdbDetails) {
  return item.title ?? item.name ?? null;
}

function getOriginalTitle(item: TmdbSearchItem | TmdbDetails) {
  return item.original_title ?? item.original_name ?? null;
}

function getPosterUrl(path?: string | null) {
  return path ? `${imageBaseUrl}${path}` : null;
}

function getYear(item: TmdbSearchItem | TmdbDetails) {
  return parseYear(item.release_date ?? item.first_air_date);
}

function normalizeRating(value?: number) {
  if (typeof value !== "number") return null;
  return Number(value.toFixed(1));
}

function toPublicMediaType(mediaType: TmdbMediaType): "movie" | "series" {
  return mediaType === "tv" ? "series" : "movie";
}

function getTmdbMediaType(item: TmdbSearchItem): TmdbMediaType | null {
  if (item.media_type === "movie" || item.media_type === "tv") {
    return item.media_type;
  }

  if (item.title || item.original_title) {
    return "movie";
  }

  if (item.name || item.original_name) {
    return "tv";
  }

  return null;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesText(value: string | null | undefined, query: string) {
  return normalizeText(value).includes(normalizeText(query));
}

function getResultTitle(movie: Pick<MovieSearchResult, "titleRu" | "titleEn" | "originalTitle">) {
  return movie.titleRu || movie.titleEn || movie.originalTitle || "";
}

function filterMovies<T extends MovieSearchResult>(movies: T[], filters?: MovieFiltersInput | null) {
  if (!filters) {
    return movies;
  }

  return movies.filter((movie) => {
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
    if (genreFilter && !movie.genres.some((genre) => matchesText(genre, genreFilter))) {
      return false;
    }

    const countryFilter = filters.country;
    if (countryFilter && !matchesText(movie.country, countryFilter)) {
      return false;
    }

    return true;
  });
}

function sortMovies<T extends MovieSearchResult>(movies: T[], sort?: MovieSortInput | null) {
  if (!sort) {
    return movies;
  }

  const direction = sort.direction === "ASC" ? 1 : -1;

  return [...movies].sort((left, right) => {
    if (sort.field === "TITLE") {
      return getResultTitle(left).localeCompare(getResultTitle(right), "ru") * direction;
    }

    if (sort.field === "YEAR") {
      return ((left.year ?? 0) - (right.year ?? 0)) * direction;
    }

    if (sort.field === "RATING") {
      return ((left.rating ?? 0) - (right.rating ?? 0)) * direction;
    }

    return 0;
  });
}

function toSearchResult(item: TmdbSearchItem, mediaType: TmdbMediaType): MovieSearchResult {
  const localizedTitle = getLocalizedTitle(item);

  return {
    id: toExternalId(mediaType, item.id),
    externalId: toExternalId(mediaType, item.id),
    titleRu: localizedTitle,
    titleEn: getOriginalTitle(item) ?? localizedTitle,
    originalTitle: getOriginalTitle(item),
    year: getYear(item),
    posterUrl: getPosterUrl(item.poster_path),
    rating: normalizeRating(item.vote_average),
    description: item.overview || null,
    mediaType: toPublicMediaType(mediaType),
    country: null,
    genres: [],
    actors: []
  };
}

export class MovieApiService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor() {
    this.baseUrl = config.movieApiUrl.replace(/\/$/, "");
    this.apiKey = config.movieApiKey;
  }

  async searchMovies(
    query: string,
    filters?: MovieFiltersInput | null,
    sort?: MovieSortInput | null
  ): Promise<MovieSearchResult[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const languages = /[а-яё]/i.test(normalizedQuery)
      ? ["ru-RU", "en-US"]
      : ["en-US", "ru-RU"];

    const responses = await Promise.all(
      languages.map((language) =>
        this.request<TmdbSearchResponse>("/search/multi", {
          query: normalizedQuery,
          language,
          include_adult: "false",
          page: "1"
        }).then((data) => ({ language, data }))
      )
    );

    const byExternalId = new Map<string, MovieSearchResult>();

    for (const response of responses) {
      for (const item of response.data.results ?? []) {
        if (item.media_type !== "movie" && item.media_type !== "tv") {
          continue;
        }

        const mediaType = item.media_type;
        const externalId = toExternalId(mediaType, item.id);
        const existing = byExternalId.get(externalId);
        const localizedTitle = getLocalizedTitle(item);
        const next: MovieSearchResult = existing ?? {
          id: externalId,
          externalId,
          originalTitle: getOriginalTitle(item),
          year: getYear(item),
          posterUrl: getPosterUrl(item.poster_path),
          rating: normalizeRating(item.vote_average),
          description: item.overview || null,
          mediaType: toPublicMediaType(mediaType),
          country: null,
          genres: [],
          actors: []
        };

        if (response.language.startsWith("ru")) {
          next.titleRu = next.titleRu ?? localizedTitle;
        } else {
          next.titleEn = next.titleEn ?? localizedTitle;
        }

        next.titleRu = next.titleRu ?? localizedTitle;
        next.titleEn = next.titleEn ?? getOriginalTitle(item) ?? localizedTitle;
        byExternalId.set(externalId, next);
      }
    }

    let movies = Array.from(byExternalId.values()).slice(0, 24);

    if (filters?.genre || filters?.country) {
      movies = await Promise.all(
        movies.map(async (movie) => {
          try {
            return (await this.getMovieDetails(movie.externalId)) ?? movie;
          } catch {
            return movie;
          }
        })
      );
    }

    return sortMovies(filterMovies(movies, filters), sort).slice(0, 24);
  }

  async getMovieDetails(externalId: string): Promise<MovieDetails | null> {
    const { mediaType, id } = parseExternalId(externalId);
    const resource = mediaType === "movie" ? "movie" : "tv";

    const [ruDetails, enDetails] = await Promise.all([
      this.request<TmdbDetails>(`/${resource}/${id}`, {
        language: "ru-RU",
        append_to_response: "credits"
      }),
      this.request<TmdbDetails>(`/${resource}/${id}`, {
        language: "en-US"
      })
    ]);

    const titleRu = getLocalizedTitle(ruDetails);
    const titleEn = getLocalizedTitle(enDetails);
    const countries =
      ruDetails.production_countries?.map((country) => country.name).filter(Boolean) ??
      ruDetails.origin_country ??
      [];

    return {
      id: externalId,
      externalId,
      titleRu: titleRu ?? titleEn,
      titleEn: titleEn ?? getOriginalTitle(ruDetails),
      originalTitle: getOriginalTitle(ruDetails) ?? getOriginalTitle(enDetails),
      year: getYear(ruDetails) ?? getYear(enDetails),
      posterUrl: getPosterUrl(ruDetails.poster_path ?? enDetails.poster_path),
      rating: normalizeRating(ruDetails.vote_average ?? enDetails.vote_average),
      description: ruDetails.overview || enDetails.overview || null,
      mediaType: toPublicMediaType(mediaType),
      country: countries.join(", ") || null,
      genres: ruDetails.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
      duration:
        ruDetails.runtime ??
        ruDetails.episode_run_time?.find((duration) => Number.isFinite(duration)) ??
        null,
      actors:
        ruDetails.credits?.cast
          ?.sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
          .slice(0, 10)
          .map((actor) => actor.name)
          .filter(Boolean) ?? []
    };
  }

  async getRelatedMovieGroups(externalId: string): Promise<RelatedMovieGroup[]> {
    const { mediaType, id } = parseExternalId(externalId);
    const resource = mediaType === "movie" ? "movie" : "tv";
    const [recommendations, similar, details] = await Promise.all([
      this.request<TmdbSearchResponse>(`/${resource}/${id}/recommendations`, {
        language: "ru-RU",
        page: "1"
      }),
      this.request<TmdbSearchResponse>(`/${resource}/${id}/similar`, {
        language: "ru-RU",
        page: "1"
      }),
      this.request<TmdbDetails>(`/${resource}/${id}`, {
        language: "ru-RU",
        append_to_response: "credits"
      })
    ]);
    const actorIds =
      details.credits?.cast
        ?.sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
        .map((actor) => actor.id)
        .filter((actorId): actorId is number => typeof actorId === "number")
        .slice(0, 2) ?? [];
    const actorMovies = await this.getMoviesByActors(actorIds, externalId);

    return [
      {
        id: "recommendations",
        title: "Из этой же вселенной",
        movies: this.mapSearchItems(recommendations.results ?? [], externalId).slice(0, 8)
      },
      {
        id: "similar",
        title: "Похожие",
        movies: this.mapSearchItems(similar.results ?? [], externalId).slice(0, 8)
      },
      {
        id: "same-actors",
        title: "С теми же актерами",
        movies: actorMovies.slice(0, 8)
      }
    ].filter((group) => group.movies.length > 0);
  }

  private mapSearchItems(items: TmdbSearchItem[], excludedExternalId?: string) {
    const byExternalId = new Map<string, MovieSearchResult>();

    for (const item of items) {
      const mediaType = getTmdbMediaType(item);

      if (!mediaType) {
        continue;
      }

      const result = toSearchResult(item, mediaType);

      if (result.externalId !== excludedExternalId) {
        byExternalId.set(result.externalId, result);
      }
    }

    return Array.from(byExternalId.values());
  }

  private async getMoviesByActors(actorIds: number[], excludedExternalId: string) {
    if (actorIds.length === 0) {
      return [];
    }

    const responses = await Promise.all(
      actorIds.map((actorId) =>
        this.request<TmdbCreditsResponse>(`/person/${actorId}/combined_credits`, {
          language: "ru-RU"
        })
      )
    );

    return this.mapSearchItems(
      responses.flatMap((response) => response.cast ?? []),
      excludedExternalId
    ).sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    if (!this.apiKey) {
      throw new GraphQLError("MOVIE_API_KEY не задан. Добавьте ключ TMDB в .env.", {
        extensions: { code: "MOVIE_API_KEY_MISSING" }
      });
    }

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("api_key", this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new GraphQLError("Не удалось получить данные из внешнего API фильмов.", {
        extensions: {
          code: "MOVIE_API_ERROR",
          status: response.status
        }
      });
    }

    return (await response.json()) as T;
  }
}

export const movieApiService = new MovieApiService();
