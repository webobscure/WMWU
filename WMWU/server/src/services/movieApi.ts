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
    cast?: { name: string; order?: number }[];
  };
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
};

export type MovieDetails = MovieSearchResult & {
  country?: string | null;
  genres: string[];
  duration?: number | null;
  actors: string[];
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

export class MovieApiService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor() {
    this.baseUrl = config.movieApiUrl.replace(/\/$/, "");
    this.apiKey = config.movieApiKey;
  }

  async searchMovies(query: string): Promise<MovieSearchResult[]> {
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
          mediaType: toPublicMediaType(mediaType)
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

    return Array.from(byExternalId.values()).slice(0, 24);
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
