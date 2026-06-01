import { gql } from "@apollo/client";

export const MOVIE_CARD_FIELDS = gql`
  fragment MovieCardFields on Movie {
    id
    externalId
    titleRu
    titleEn
    originalTitle
    year
    posterUrl
    rating
    description
    mediaType
    country
    genres
    duration
    actors
    createdAt
  }
`;

export const SEARCH_MOVIES = gql`
  query SearchMovies($query: String!) {
    searchMovies(query: $query) {
      id
      externalId
      titleRu
      titleEn
      originalTitle
      year
      posterUrl
      rating
      description
      mediaType
    }
  }
`;

export const MOVIE_DETAILS = gql`
  query MovieDetails($id: String!) {
    movieDetails(id: $id) {
      id
      externalId
      titleRu
      titleEn
      originalTitle
      year
      posterUrl
      rating
      description
      mediaType
      country
      genres
      duration
      actors
    }
  }
`;

export const COLLECTION_FIELDS = gql`
  ${MOVIE_CARD_FIELDS}
  fragment CollectionFields on Collection {
    id
    title
    description
    tags
    movieCount
    createdAt
    updatedAt
    movies {
      ...MovieCardFields
    }
  }
`;

export const USER_MOVIE_FIELDS = gql`
  ${MOVIE_CARD_FIELDS}
  fragment UserMovieFields on UserMovie {
    id
    status
    personalRating
    note
    watchedAt
    createdAt
    updatedAt
    movie {
      ...MovieCardFields
    }
  }
`;

export const COLLECTIONS = gql`
  ${COLLECTION_FIELDS}
  query Collections {
    collections {
      ...CollectionFields
    }
  }
`;

export const COLLECTION = gql`
  ${COLLECTION_FIELDS}
  query Collection($id: ID!) {
    collection(id: $id) {
      ...CollectionFields
    }
  }
`;

export const WATCHLIST = gql`
  ${COLLECTION_FIELDS}
  query Watchlist {
    watchlist {
      ...CollectionFields
    }
  }
`;

export const SAVED_MOVIES = gql`
  ${USER_MOVIE_FIELDS}
  query SavedMovies($status: WatchStatus) {
    savedMovies(status: $status) {
      ...UserMovieFields
    }
  }
`;

export const MOVIE_PROGRESS = gql`
  ${USER_MOVIE_FIELDS}
  query MovieProgress($movieId: ID!) {
    movieProgress(movieId: $movieId) {
      ...UserMovieFields
    }
  }
`;

export const CREATE_COLLECTION = gql`
  ${COLLECTION_FIELDS}
  mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
      ...CollectionFields
    }
  }
`;

export const UPDATE_COLLECTION = gql`
  ${COLLECTION_FIELDS}
  mutation UpdateCollection($id: ID!, $input: UpdateCollectionInput!) {
    updateCollection(id: $id, input: $input) {
      ...CollectionFields
    }
  }
`;

export const DELETE_COLLECTION = gql`
  mutation DeleteCollection($id: ID!) {
    deleteCollection(id: $id)
  }
`;

export const ADD_MOVIE_TO_COLLECTION = gql`
  ${COLLECTION_FIELDS}
  mutation AddMovieToCollection($collectionId: ID!, $movieInput: MovieInput!) {
    addMovieToCollection(collectionId: $collectionId, movieInput: $movieInput) {
      ...CollectionFields
    }
  }
`;

export const REMOVE_MOVIE_FROM_COLLECTION = gql`
  ${COLLECTION_FIELDS}
  mutation RemoveMovieFromCollection($collectionId: ID!, $movieId: ID!) {
    removeMovieFromCollection(collectionId: $collectionId, movieId: $movieId) {
      ...CollectionFields
    }
  }
`;

export const ADD_MOVIE_TO_WATCHLIST = gql`
  ${COLLECTION_FIELDS}
  mutation AddMovieToWatchlist($movieInput: MovieInput!) {
    addMovieToWatchlist(movieInput: $movieInput) {
      ...CollectionFields
    }
  }
`;

export const REMOVE_MOVIE_FROM_WATCHLIST = gql`
  ${COLLECTION_FIELDS}
  mutation RemoveMovieFromWatchlist($movieId: ID!) {
    removeMovieFromWatchlist(movieId: $movieId) {
      ...CollectionFields
    }
  }
`;

export const UPDATE_MOVIE_PROGRESS = gql`
  ${USER_MOVIE_FIELDS}
  mutation UpdateMovieProgress($movieId: ID!, $input: UpdateMovieProgressInput!) {
    updateMovieProgress(movieId: $movieId, input: $input) {
      ...UserMovieFields
    }
  }
`;
