import { useMutation, useQuery } from "@apollo/client";
import { BookmarkCheck, FolderPlus, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type { Collection } from "../../entities/collection/types";
import { getMovieTitle, type MovieInput, type MovieSearchResult } from "../../entities/movie/types";
import { ADD_MOVIE_TO_COLLECTION, COLLECTIONS, CREATE_COLLECTION, SAVED_MOVIES } from "../../shared/graphql/documents";
import styles from "./AddToCollectionModal.module.css";

type Props = {
  movie: MovieSearchResult | null;
  movieInput: MovieInput | null;
  onClose: () => void;
};

type CollectionsQuery = {
  collections: Collection[];
};

export function AddToCollectionModal({ movie, movieInput, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data, loading, error } = useQuery<CollectionsQuery>(COLLECTIONS, {
    skip: !movie
  });
  const [createCollection, createState] = useMutation(CREATE_COLLECTION, {
    refetchQueries: [COLLECTIONS]
  });
  const [addMovie, addState] = useMutation(ADD_MOVIE_TO_COLLECTION, {
    refetchQueries: [COLLECTIONS, SAVED_MOVIES]
  });

  const collections = data?.collections ?? [];
  const disabled = loading || addState.loading || !movieInput;
  const movieTitle = useMemo(() => (movie ? getMovieTitle(movie) : ""), [movie]);

  if (!movie || !movieInput) {
    return null;
  }

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      return;
    }

    await createCollection({
      variables: {
        input: {
          title: normalizedTitle,
          description: description.trim() || null
        }
      }
    });
    setTitle("");
    setDescription("");
  }

  async function handleAdd(collectionId: string) {
    await addMovie({
      variables: {
        collectionId,
        movieInput
      }
    });
    onClose();
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-collection-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p>Добавление фильма</p>
            <h2 id="add-to-collection-title">{movieTitle}</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} aria-label="Закрыть">
            <X size={18} aria-hidden />
          </button>
        </header>

        {error ? <p className={styles.error}>Не удалось загрузить коллекции: {error.message}</p> : null}

        <div className={styles.collectionList}>
          {loading ? <p className={styles.muted}>Загружаем коллекции...</p> : null}
          {!loading && collections.length === 0 ? (
            <p className={styles.muted}>Коллекций пока нет. Создайте первую ниже.</p>
          ) : null}
          {collections.map((collection) => (
            <button
              key={collection.id}
              className={styles.collectionButton}
              type="button"
              disabled={disabled}
              onClick={() => handleAdd(collection.id)}
            >
              <BookmarkCheck size={18} aria-hidden />
              <span>
                <strong>{collection.title}</strong>
                <small>{collection.movieCount} фильмов</small>
              </span>
            </button>
          ))}
        </div>

        <form className={styles.form} onSubmit={handleCreateCollection}>
          <label>
            Название новой коллекции
            <input
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например, Фильмы 90-х"
            />
          </label>
          <label>
            Описание
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Короткое описание подборки"
            />
          </label>
          <button className="buttonPrimary" type="submit" disabled={createState.loading || !title.trim()}>
            <FolderPlus size={18} aria-hidden />
            Создать коллекцию
          </button>
        </form>
      </section>
    </div>
  );
}
