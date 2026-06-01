import { useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, Search, Timer, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { MovieCard } from "../../components/MovieCard/MovieCard";
import type { Collection } from "../../entities/collection/types";
import { REMOVE_MOVIE_FROM_WATCHLIST, WATCHLIST } from "../../shared/graphql/documents";
import styles from "./WatchlistPage.module.css";

type WatchlistData = {
  watchlist: Collection;
};

export function WatchlistPage() {
  const { data, loading, error } = useQuery<WatchlistData>(WATCHLIST);
  const [removeMovie, removeState] = useMutation(REMOVE_MOVIE_FROM_WATCHLIST);
  const watchlist = data?.watchlist;
  const movies = watchlist?.movies ?? [];

  return (
    <section className={styles.page}>
      <div className="container">
        <Link className={styles.backLink} to="/">
          <ArrowLeft size={18} aria-hidden />
          К поиску
        </Link>

        <div className={styles.header}>
          <div>
            <span>
              <Timer size={18} aria-hidden />
              {movies.length} фильмов
            </span>
            <h1>Хочу посмотреть</h1>
            <p>Фильмы и сериалы показаны в порядке добавления: от первых сохраненных к последним.</p>
          </div>
        </div>

        {loading ? <div className={styles.state}>Загружаем список...</div> : null}
        {error ? (
          <div className={styles.state}>
            <h2>Не удалось загрузить список</h2>
            <p>{error.message}</p>
          </div>
        ) : null}

        {!loading && !error && movies.length === 0 ? (
          <div className={styles.empty}>
            <Search size={28} aria-hidden />
            <h2>Список пока пуст</h2>
            <p>Найдите фильм и нажмите кнопку с иконкой часов на карточке или на странице фильма.</p>
            <Link className="buttonPrimary" to="/">
              Найти фильмы
            </Link>
          </div>
        ) : null}

        {movies.length > 0 ? (
          <div className={styles.movieGrid}>
            {movies.map((movie, index) => (
              <div className={styles.movieWrap} key={movie.id}>
                <div className={styles.order}>{index + 1}</div>
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
                  onClick={() => removeMovie({ variables: { movieId: movie.id } })}
                >
                  <Trash2 size={17} aria-hidden />
                  Убрать из списка
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
