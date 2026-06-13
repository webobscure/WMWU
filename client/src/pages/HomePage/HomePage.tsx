import { useMutation, useQuery } from "@apollo/client";
import { AlertCircle, BookmarkPlus, CheckCircle2, Search, Sparkles, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AddToCollectionModal } from "../../components/AddToCollectionModal/AddToCollectionModal";
import { MovieCardSkeletons } from "../../components/Loading/Skeleton";
import { MovieCard } from "../../components/MovieCard/MovieCard";
import { MovieFiltersBar } from "../../components/MovieFiltersBar/MovieFiltersBar";
import type { MovieFilters, MovieSearchResult, MovieSort, TasteRecommendation } from "../../entities/movie/types";
import { toMovieInput } from "../../entities/movie/types";
import { useMovieSearch } from "../../features/movieSearch/useMovieSearch";
import {
  ADD_MOVIE_TO_LIBRARY,
  ADD_MOVIE_TO_WATCHLIST,
  SAVED_MOVIES,
  TASTE_RECOMMENDATIONS,
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

type TasteRecommendationsData = {
  tasteRecommendations: TasteRecommendation[];
};

export function HomePage() {
  const [query, setQuery] = useState("");
  const [emptyQuery, setEmptyQuery] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<MovieFilters>({});
  const [sort, setSort] = useState<MovieSort>({ field: "RATING", direction: "DESC" });
  const [areSuggestionsOpen, setAreSuggestionsOpen] = useState(false);
  const [searchMovies, { data, loading, error, called }] = useMovieSearch();
  const [loadSuggestions, suggestionsState] = useMovieSearch();
  const { data: tasteData } = useQuery<TasteRecommendationsData>(TASTE_RECOMMENDATIONS);
  const [addMovieToWatchlist] = useMutation(ADD_MOVIE_TO_WATCHLIST, {
    refetchQueries: [WATCHLIST, SAVED_MOVIES, TASTE_RECOMMENDATIONS]
  });
  const [addMovieToLibrary] = useMutation(ADD_MOVIE_TO_LIBRARY, {
    refetchQueries: [SAVED_MOVIES, TASTE_RECOMMENDATIONS]
  });
  const movies = data?.searchMovies ?? [];
  const tasteRecommendations = tasteData?.tasteRecommendations ?? [];

  useEffect(() => {
    if (query.trim()) {
      setEmptyQuery(false);
    }
  }, [query]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadSuggestions({
        variables: {
          query: normalizedQuery,
          filters,
          sort: { field: "RATING", direction: "DESC" }
        }
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [filters, loadSuggestions, query]);

  const modalMovieInput = useMemo(() => (selectedMovie ? toMovieInput(selectedMovie) : null), [selectedMovie]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setEmptyQuery(true);
      return;
    }

    setAreSuggestionsOpen(false);
    searchMovies({ variables: { query: normalizedQuery, filters, sort } });
  }

  function handleSuggestion(movie: MovieSearchResult) {
    const title = movie.titleRu || movie.titleEn || movie.originalTitle || "";
    setQuery(title);
    setAreSuggestionsOpen(false);
    searchMovies({
      variables: {
        query: title,
        filters,
        sort
      }
    });
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
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setAreSuggestionsOpen(true);
                    }}
                    onFocus={() => setAreSuggestionsOpen(true)}
                    placeholder="Название фильма или сериала"
                    aria-label="Название фильма или сериала"
                  />
                  {areSuggestionsOpen && query.trim().length >= 2 && suggestionsState.data?.searchMovies.length ? (
                    <div className={styles.suggestions}>
                      {suggestionsState.data.searchMovies.slice(0, 6).map((movie) => (
                        <button key={movie.externalId} type="button" onClick={() => handleSuggestion(movie)}>
                          <span>{movie.titleRu || movie.titleEn || movie.originalTitle}</span>
                          <small>{movie.year ?? "год не указан"}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
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
        {tasteRecommendations.length > 0 ? (
          <section className={styles.tasteSection} aria-label="Рекомендации по похожему вкусу">
            <div className={styles.tasteHeader}>
              <div>
                <span>
                  <UsersRound size={18} aria-hidden />
                  Похожие вкусы
                </span>
                <h2>Понравилось пользователям со схожим вкусом</h2>
              </div>
            </div>

            <div className={styles.tasteGrid}>
              {tasteRecommendations.map((recommendation) => (
                <article className={styles.tasteCard} key={recommendation.movie.id}>
                  <MovieCard
                    movie={recommendation.movie}
                    onAdd={setSelectedMovie}
                    onLibrary={handleLibrary}
                    onWatchlist={handleWatchlist}
                  />
                  <div className={styles.tasteReason}>
                    <strong>{recommendation.reason}</strong>
                    {recommendation.sourceUsers.length > 0 ? (
                      <small>{recommendation.sourceUsers.join(", ")}</small>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <MovieFiltersBar filters={filters} sort={sort} onFiltersChange={setFilters} onSortChange={setSort} />

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
