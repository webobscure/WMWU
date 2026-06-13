import { useQuery } from "@apollo/client";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MovieCard } from "../../components/MovieCard/MovieCard";
import { MovieProgressEditor } from "../../components/MovieProgressEditor/MovieProgressEditor";
import { MovieFiltersBar } from "../../components/MovieFiltersBar/MovieFiltersBar";
import type { MovieFilters, MovieSort, UserMovie, WatchStatus } from "../../entities/movie/types";
import { watchStatusLabels } from "../../entities/movie/types";
import { SAVED_MOVIES } from "../../shared/graphql/documents";
import styles from "./LibraryPage.module.css";

type SavedMoviesData = {
  savedMovies: UserMovie[];
};

const filters: { value: WatchStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  ...Object.entries(watchStatusLabels).map(([value, label]) => ({
    value: value as WatchStatus,
    label
  }))
];

export function LibraryPage() {
  const [status, setStatus] = useState<WatchStatus | "ALL">("ALL");
  const [filtersState, setFiltersState] = useState<MovieFilters>({});
  const [sort, setSort] = useState<MovieSort>({ field: "ADDED_AT", direction: "DESC" });
  const { data, loading, error } = useQuery<SavedMoviesData>(SAVED_MOVIES, {
    variables: {
      status: status === "ALL" ? null : status,
      filters: filtersState,
      sort
    }
  });
  const entries = data?.savedMovies ?? [];

  return (
    <section className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <span>
              <BookOpen size={18} aria-hidden />
              {entries.length} записей
            </span>
            <h1>Моя библиотека</h1>
            <p>Единый список сохраненных фильмов со статусом просмотра, личной оценкой и заметкой.</p>
          </div>
        </div>

        <div className={styles.filters} aria-label="Фильтр по статусу просмотра">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={filter.value === status ? styles.activeFilter : styles.filter}
              type="button"
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <MovieFiltersBar
          filters={filtersState}
          sort={sort}
          onFiltersChange={setFiltersState}
          onSortChange={setSort}
        />

        {loading ? <div className={styles.state}>Загружаем библиотеку...</div> : null}
        {error ? (
          <div className={styles.state}>
            <h2>Не удалось загрузить библиотеку</h2>
            <p>{error.message}</p>
          </div>
        ) : null}

        {!loading && !error && entries.length === 0 ? (
          <div className={styles.empty}>
            <Search size={28} aria-hidden />
            <h2>Пока нет сохраненных фильмов</h2>
            <p>Добавьте фильм в коллекцию или список “Хочу посмотреть”, и он появится здесь.</p>
            <Link className="buttonPrimary" to="/">
              Найти фильмы
            </Link>
          </div>
        ) : null}

        <div className={styles.grid}>
          {entries.map((entry) => (
            <article className={styles.entry} key={entry.id}>
              <MovieCard
                movie={entry.movie}
                onAdd={() => undefined}
                showAddButton={false}
                showWatchlistButton={false}
              />
              <MovieProgressEditor entry={entry} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
