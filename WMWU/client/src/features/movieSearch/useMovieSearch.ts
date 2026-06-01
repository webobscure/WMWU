import { useLazyQuery } from "@apollo/client";
import type { MovieSearchResult } from "../../entities/movie/types";
import { SEARCH_MOVIES } from "../../shared/graphql/documents";

type SearchMoviesData = {
  searchMovies: MovieSearchResult[];
};

type SearchMoviesVars = {
  query: string;
};

export function useMovieSearch() {
  return useLazyQuery<SearchMoviesData, SearchMoviesVars>(SEARCH_MOVIES, {
    fetchPolicy: "network-only"
  });
}
