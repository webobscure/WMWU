import type { PersistedMovie } from "../movie/types";

export type Collection = {
  id: string;
  title: string;
  description?: string | null;
  tags: string[];
  movieCount: number;
  movies: PersistedMovie[];
  createdAt: string;
  updatedAt: string;
};
