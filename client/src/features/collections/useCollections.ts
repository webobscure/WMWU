import { useMutation, useQuery } from "@apollo/client";
import type { Collection } from "../../entities/collection/types";
import type { MovieFilters, MovieSort } from "../../entities/movie/types";
import {
  COLLECTION,
  COLLECTIONS,
  CREATE_COLLECTION,
  DELETE_COLLECTION,
  REMOVE_MOVIE_FROM_COLLECTION,
  UPDATE_COLLECTION
} from "../../shared/graphql/documents";

export type CollectionsData = {
  collections: Collection[];
};

export type CollectionData = {
  collection: Collection | null;
};

export function useCollections() {
  return useQuery<CollectionsData>(COLLECTIONS);
}

export function useCollection(id: string, filters?: MovieFilters, sort?: MovieSort) {
  return useQuery<CollectionData>(COLLECTION, {
    variables: { id, filters, sort },
    skip: !id
  });
}

export function useCollectionMutations() {
  const [createCollection, createState] = useMutation(CREATE_COLLECTION, {
    refetchQueries: [COLLECTIONS]
  });
  const [updateCollection, updateState] = useMutation(UPDATE_COLLECTION);
  const [deleteCollection, deleteState] = useMutation(DELETE_COLLECTION, {
    refetchQueries: [COLLECTIONS]
  });
  const [removeMovie, removeState] = useMutation(REMOVE_MOVIE_FROM_COLLECTION);

  return {
    createCollection,
    createState,
    updateCollection,
    updateState,
    deleteCollection,
    deleteState,
    removeMovie,
    removeState
  };
}
