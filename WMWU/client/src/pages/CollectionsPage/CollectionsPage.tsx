import { AlertCircle, Film, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CollectionForm } from "../../components/CollectionForm/CollectionForm";
import { useCollectionMutations, useCollections } from "../../features/collections/useCollections";
import styles from "./CollectionsPage.module.css";

export function CollectionsPage() {
  const { data, loading, error } = useCollections();
  const { createCollection, createState, deleteCollection, deleteState } = useCollectionMutations();
  const collections = data?.collections ?? [];

  return (
    <section className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1>Тематические коллекции</h1>
            <p>Создавайте подборки, редактируйте описания и возвращайтесь к сохраненным фильмам.</p>
          </div>
        </div>

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
                    <Link className="buttonSecondary" to={`/collections/${collection.id}`}>
                      <Pencil size={17} aria-hidden />
                      Открыть
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
