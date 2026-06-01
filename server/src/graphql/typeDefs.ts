export const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
  }

  type Movie {
    id: ID!
    externalId: String!
    titleRu: String
    titleEn: String
    originalTitle: String
    year: Int
    posterUrl: String
    rating: Float
    description: String
    mediaType: String
    country: String
    genres: [String!]!
    duration: Int
    actors: [String!]!
    createdAt: String!
  }

  type MovieSearchResult {
    id: String!
    externalId: String!
    titleRu: String
    titleEn: String
    originalTitle: String
    year: Int
    posterUrl: String
    rating: Float
    description: String
    mediaType: String!
  }

  type MovieDetails {
    id: String!
    externalId: String!
    titleRu: String
    titleEn: String
    originalTitle: String
    year: Int
    posterUrl: String
    rating: Float
    description: String
    mediaType: String!
    country: String
    genres: [String!]!
    duration: Int
    actors: [String!]!
  }

  enum WatchStatus {
    WANT_TO_WATCH
    WATCHING
    WATCHED
    DROPPED
    REWATCH
  }

  type UserMovie {
    id: ID!
    user: User!
    movie: Movie!
    status: WatchStatus!
    personalRating: Int
    note: String
    watchedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type Collection {
    id: ID!
    title: String!
    description: String
    tags: [String!]!
    user: User!
    movies: [Movie!]!
    movieCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  input CreateCollectionInput {
    title: String!
    description: String
    tags: [String!]
  }

  input UpdateCollectionInput {
    title: String
    description: String
    tags: [String!]
  }

  input MovieInput {
    externalId: String!
    titleRu: String
    titleEn: String
    originalTitle: String
    year: Int
    posterUrl: String
    rating: Float
    description: String
    mediaType: String
    country: String
    genres: [String!]
    duration: Int
    actors: [String!]
  }

  input UpdateMovieProgressInput {
    status: WatchStatus
    personalRating: Int
    note: String
    watchedAt: String
  }

  type Query {
    searchMovies(query: String!): [MovieSearchResult!]!
    movieDetails(id: String!): MovieDetails
    collections: [Collection!]!
    collection(id: ID!): Collection
    watchlist: Collection!
    savedMovies(status: WatchStatus): [UserMovie!]!
    movieProgress(movieId: ID!): UserMovie
  }

  type Mutation {
    createCollection(input: CreateCollectionInput!): Collection!
    updateCollection(id: ID!, input: UpdateCollectionInput!): Collection!
    deleteCollection(id: ID!): Boolean!
    addMovieToCollection(collectionId: ID!, movieInput: MovieInput!): Collection!
    removeMovieFromCollection(collectionId: ID!, movieId: ID!): Collection!
    addMovieToWatchlist(movieInput: MovieInput!): Collection!
    removeMovieFromWatchlist(movieId: ID!): Collection!
    updateMovieProgress(movieId: ID!, input: UpdateMovieProgressInput!): UserMovie!
  }
`;
