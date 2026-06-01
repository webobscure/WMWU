import { useMutation } from "@apollo/client";
import { AlertCircle, BookmarkPlus, CheckCircle2, Search, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AddToCollectionModal } from "../../components/AddToCollectionModal/AddToCollectionModal";
import { MovieCard } from "../../components/MovieCard/MovieCard";
import { MovieCardSkeletons } from "../../components/Loading/Skeleton";
import type { MovieSearchResult } from "../../entities/movie/types";
import { toMovieInput } from "../../entities/movie/types";
import { useMovieSearch } from "../../features/movieSearch/useMovieSearch";
import {
  ADD_MOVIE_TO_LIBRARY,
  ADD_MOVIE_TO_WATCHLIST,
  SAVED_MOVIES,
  WATCHLIST
} from "../../shared/graphql/documents";
import styles from "./HomePage.module.css";

const recommendedCollections = [
  "Фильмы на вечер",
  "Лучшие триллеры",
  "Посмотреть позже",
  "Русское кино",
  "Фильмы 90-х",
  "Сериалы для выходных"
];

export function HomePage() {
  const [query, setQuery] = useState("");
  const [emptyQuery, setEmptyQuery] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const [searchMovies, { data, loading, error, called }] = useMovieSearch();
  const [addMovieToWatchlist] = useMutation(ADD_MOVIE_TO_WATCHLIST, {
    refetchQueries: [WATCHLIST, SAVED_MOVIES]
  });
  const [addMovieToLibrary] = useMutation(ADD_MOVIE_TO_LIBRARY, {
    refetchQueries: [SAVED_MOVIES]
  });
  const movies = data?.searchMovies ?? [];

  useEffect(() => {
    if (query.trim()) {
      setEmptyQuery(false);
    }
  }, [query]);

  const modalMovieInput = useMemo(() => (selectedMovie ? toMovieInput(selectedMovie) : null), [selectedMovie]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setEmptyQuery(true);
      return;
    }

    searchMovies({ variables: { query: normalizedQuery } });
  }

  async function handleWatchlist(movie: MovieSearchResult) {
    await addMovieToWatchlist({
      variables: {
        movieInput: toMovieInput(movie)
      }
    });
    setWatchlistMessage(`Добавлено: ${movie.titleRu || movie.titleEn || movie.originalTitle || "фильм"}`);
  }

  async function handleLibrary(movie: MovieSearchResult) {
    await addMovieToLibrary({
      variables: {
        movieInput: toMovieInput(movie)
      }
    });
    setWatchlistMessage(`В библиотеке: ${movie.titleRu || movie.titleEn || movie.originalTitle || "фильм"}`);
  }

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <h1>Находите фильмы и собирайте подборки</h1>
              <p>
                Поиск работает на русском и английском языке, а найденные фильмы можно сразу сохранить в
                тематические коллекции для просмотра позже.
              </p>

              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <div className={styles.searchInputWrap}>
                  <Search size={20} aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Название фильма или сериала"
                    aria-label="Название фильма или сериала"
                  />
                </div>
                <button className="buttonPrimary" type="submit" disabled={loading}>
                  Искать
                </button>
              </form>

              {emptyQuery ? (
                <p className={styles.inlineError}>
                  <AlertCircle size={17} aria-hidden />
                  Введите название фильма или сериала.
                </p>
              ) : null}
            </div>

            <aside className={styles.recommendations} aria-label="Рекомендованные коллекции">
              <div className={styles.recommendationHeader}>
                <Sparkles size={18} aria-hidden />
                Популярные идеи
              </div>
              <div className={styles.collectionChips}>
                {recommendedCollections.map((collection) => (
                  <button key={collection} type="button" onClick={() => setQuery(collection.replace("Фильмы ", ""))}>
                    {collection}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="container">
        <div className={styles.resultsHeader}>
          <div>
            <h2>Результаты поиска</h2>
            <p>Карточки содержат постер, год, рейтинг и быстрые действия.</p>
          </div>
          <button className="buttonSecondary" type="button" onClick={() => setQuery("Матрица")}>
            <BookmarkPlus size={18} aria-hidden />
            Пример запроса
          </button>
        </div>

        {error ? (
          <div className={styles.stateBox}>
            <AlertCircle size={24} aria-hidden />
            <h3>Не удалось выполнить поиск</h3>
            <p>{error.message}</p>
          </div>
        ) : null}

        {!called && !loading && !error ? (
          <div className={styles.stateBox}>
            <Search size={24} aria-hidden />
            <h3>Начните с поиска</h3>
            <p>Введите полное или частичное название на русском или английском языке.</p>
          </div>
        ) : null}

        {called && !loading && !error && movies.length === 0 ? (
          <div className={styles.stateBox}>
            <Search size={24} aria-hidden />
            <h3>Ничего не найдено</h3>
            <p>Попробуйте другое название, оригинальное название или часть названия.</p>
          </div>
        ) : null}

        <div className={styles.movieGrid}>
          {loading ? <MovieCardSkeletons count={8} /> : null}
          {!loading
            ? movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onAdd={setSelectedMovie}
                  onLibrary={handleLibrary}
                  onWatchlist={handleWatchlist}
                />
              ))
            : null}
        </div>
      </section>

      {watchlistMessage ? (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={18} aria-hidden />
          {watchlistMessage}
        </div>
      ) : null}

      <AddToCollectionModal
        movie={selectedMovie}
        movieInput={modalMovieInput}
        onClose={() => setSelectedMovie(null)}
      />
    </>
  );
}
