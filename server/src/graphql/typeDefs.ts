export const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String!
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
    country: String
    genres: [String!]!
    actors: [String!]!
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

  type AuthPayload {
    user: User!
  }

  type RelatedMovieGroup {
    id: ID!
    title: String!
    movies: [MovieSearchResult!]!
  }

  type SmartCollection {
    id: ID!
    title: String!
    description: String!
    movies: [Movie!]!
    movieCount: Int!
  }

  type TasteRecommendation {
    movie: Movie!
    score: Float!
    reason: String!
    sourceUsers: [String!]!
  }

  enum MovieSortField {
    ADDED_AT
    RATING
    YEAR
    TITLE
  }

  enum SortDirection {
    ASC
    DESC
  }

  input MovieFiltersInput {
    yearFrom: Int
    yearTo: Int
    genre: String
    mediaType: String
    ratingFrom: Float
    country: String
  }

  input MovieSortInput {
    field: MovieSortField!
    direction: SortDirection!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
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
    me: User
    searchMovies(query: String!, filters: MovieFiltersInput, sort: MovieSortInput): [MovieSearchResult!]!
    movieDetails(id: String!): MovieDetails
    relatedMovies(id: String!): [RelatedMovieGroup!]!
    collections: [Collection!]!
    collection(id: ID!, filters: MovieFiltersInput, sort: MovieSortInput): Collection
    watchlist(filters: MovieFiltersInput, sort: MovieSortInput): Collection!
    savedMovies(status: WatchStatus, filters: MovieFiltersInput, sort: MovieSortInput): [UserMovie!]!
    smartCollections: [SmartCollection!]!
    tasteRecommendations: [TasteRecommendation!]!
    movieProgress(movieId: ID!): UserMovie
    movieProgressByExternalId(externalId: String!): UserMovie
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    claimMockUserData: Boolean!
    createCollection(input: CreateCollectionInput!): Collection!
    updateCollection(id: ID!, input: UpdateCollectionInput!): Collection!
    deleteCollection(id: ID!): Boolean!
    addMovieToCollection(collectionId: ID!, movieInput: MovieInput!): Collection!
    removeMovieFromCollection(collectionId: ID!, movieId: ID!): Collection!
    addMovieToWatchlist(movieInput: MovieInput!): Collection!
    removeMovieFromWatchlist(movieId: ID!): Collection!
    addMovieToLibrary(movieInput: MovieInput!): UserMovie!
    updateMovieProgress(movieId: ID!, input: UpdateMovieProgressInput!): UserMovie!
  }
`;
