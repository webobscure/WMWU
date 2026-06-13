import { useQuery } from "@apollo/client";
import { AlertCircle, ExternalLink, Film, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CollectionForm } from "../../components/CollectionForm/CollectionForm";
import type { SmartCollection } from "../../entities/movie/types";
import { useCollectionMutations, useCollections } from "../../features/collections/useCollections";
import { SMART_COLLECTIONS } from "../../shared/graphql/documents";
import styles from "./CollectionsPage.module.css";

type SmartCollectionsData = {
  smartCollections: SmartCollection[];
};

export function CollectionsPage() {
  const { data, loading, error } = useCollections();
  const { data: smartData } = useQuery<SmartCollectionsData>(SMART_COLLECTIONS);
  const { createCollection, createState, deleteCollection, deleteState } = useCollectionMutations();
  const collections = data?.collections ?? [];
  const smartCollections = smartData?.smartCollections.filter((collection) => collection.movieCount > 0) ?? [];

  return (
    <section className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1>Тематические коллекции</h1>
            <p>Создавайте подборки, редактируйте описания и возвращайтесь к сохраненным фильмам.</p>
          </div>
        </div>

        {smartCollections.length > 0 ? (
          <section className={styles.smartSection} aria-label="Умные коллекции">
            <div className={styles.smartHeader}>
              <Sparkles size={18} aria-hidden />
              Умные коллекции
            </div>
            <div className={styles.smartGrid}>
              {smartCollections.map((collection) => (
                <article className={styles.smartCard} key={collection.id}>
                  <span>{collection.movieCount} фильмов</span>
                  <h2>{collection.title}</h2>
                  <p>{collection.description}</p>
                  <div className={styles.smartMovies}>
                    {collection.movies.slice(0, 4).map((movie) => (
                      <small key={movie.id}>{movie.titleRu || movie.titleEn || movie.originalTitle}</small>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.grid}>
          <aside className={styles.createPanel}>
            <h2>Новая коллекция</h2>
            <CollectionForm
              submitLabel="Создать"
              loading={createState.loading}
              onSubmit={(input) => createCollection({ variables: { input } })}
            />
          </aside>

          <div className={styles.listPanel}>
            {loading ? <div className={styles.state}>Загружаем коллекции...</div> : null}
            {error ? (
              <div className={styles.state}>
                <AlertCircle size={24} aria-hidden />
                <span>{error.message}</span>
              </div>
            ) : null}
            {!loading && !error && collections.length === 0 ? (
              <div className={styles.state}>
                <Film size={24} aria-hidden />
                <span>Коллекций пока нет. Создайте первую подборку.</span>
              </div>
            ) : null}

            <div className={styles.collectionGrid}>
              {collections.map((collection) => (
                <article className={styles.collectionCard} key={collection.id}>
                  <Link to={`/collections/${collection.id}`} className={styles.cardLink}>
                    <span>{collection.movieCount} фильмов</span>
                    <h2>{collection.title}</h2>
                    <p>{collection.description || "Описание не добавлено."}</p>
                    {collection.tags.length > 0 ? (
                      <div className={styles.tags}>
                        {collection.tags.map((tag) => (
                          <small key={tag}>#{tag}</small>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                  <div className={styles.cardActions}>
                    <Link
                      className="iconButton"
                      to={`/collections/${collection.id}`}
                      aria-label={`Открыть коллекцию ${collection.title}`}
                      title="Открыть"
                    >
                      <ExternalLink size={17} aria-hidden />
                    </Link>
                    <button
                      className="iconButton"
                      type="button"
                      aria-label="Удалить коллекцию"
                      disabled={deleteState.loading}
                      onClick={() => deleteCollection({ variables: { id: collection.id } })}
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
