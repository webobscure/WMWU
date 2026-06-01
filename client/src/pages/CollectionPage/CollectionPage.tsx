import { useApolloClient } from "@apollo/client";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CollectionForm } from "../../components/CollectionForm/CollectionForm";
import { MovieCard } from "../../components/MovieCard/MovieCard";
import { useCollection, useCollectionMutations } from "../../features/collections/useCollections";
import { COLLECTIONS } from "../../shared/graphql/documents";
import styles from "./CollectionPage.module.css";

export function CollectionPage() {
  const { collectionId = "" } = useParams();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading, error } = useCollection(collectionId);
  const { updateCollection, updateState, deleteCollection, deleteState, removeMovie, removeState } =
    useCollectionMutations();
  const collection = data?.collection ?? null;

  async function handleDeleteCollection() {
    await deleteCollection({ variables: { id: collectionId } });
    await client.refetchQueries({ include: [COLLECTIONS] });
    navigate("/collections");
  }

  if (loading) {
    return (
      <section className="container">
        <div className={styles.state}>Загружаем коллекцию...</div>
      </section>
    );
  }

  if (error || !collection) {
    return (
      <section className="container">
        <div className={styles.state}>
          <h1>{error ? "Не удалось загрузить коллекцию" : "Коллекция не найдена"}</h1>
          {error ? <p>{error.message}</p> : null}
          <Link className="buttonSecondary" to="/collections">
            <ArrowLeft size={18} aria-hidden />
            К списку коллекций
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <Link className={styles.backLink} to="/collections">
          <ArrowLeft size={18} aria-hidden />
          К списку коллекций
        </Link>

        <div className={styles.header}>
          <div>
            <span>{collection.movieCount} фильмов</span>
            <h1>{collection.title}</h1>
            <p>{collection.description || "Описание не добавлено."}</p>
            {collection.tags.length > 0 ? (
              <div className={styles.tags}>
                {collection.tags.map((tag) => (
                  <small key={tag}>#{tag}</small>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="buttonDanger"
            type="button"
            disabled={deleteState.loading}
            onClick={handleDeleteCollection}
          >
            <Trash2 size={18} aria-hidden />
            Удалить
          </button>
        </div>

        <div className={styles.grid}>
          <aside className={styles.editPanel}>
            <h2>Редактировать</h2>
            <CollectionForm
              initialTitle={collection.title}
              initialDescription={collection.description}
              initialTags={collection.tags}
              submitLabel="Сохранить"
              loading={updateState.loading}
              onSubmit={(input) =>
                updateCollection({
                  variables: {
                    id: collection.id,
                    input
                  }
                })
              }
            />
          </aside>

          <div className={styles.moviesPanel}>
            {collection.movies.length === 0 ? (
              <div className={styles.empty}>
                <h2>В коллекции пока нет фильмов</h2>
                <p>Вернитесь к поиску и добавьте фильмы через кнопку на карточке.</p>
                <Link className="buttonPrimary" to="/">
                  Найти фильмы
                </Link>
              </div>
            ) : (
              <div className={styles.movieGrid}>
                {collection.movies.map((movie) => (
                  <div className={styles.movieWrap} key={movie.id}>
                    <MovieCard
                      movie={movie}
                      onAdd={() => undefined}
                      showAddButton={false}
                      showWatchlistButton={false}
                    />
                    <button
                      className={styles.removeButton}
                      type="button"
                      disabled={removeState.loading}
                      onClick={() =>
                        removeMovie({
                          variables: {
                            collectionId: collection.id,
                            movieId: movie.id
                          }
                        })
                      }
                    >
                      <Trash2 size={17} aria-hidden />
                      Удалить из коллекции
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
