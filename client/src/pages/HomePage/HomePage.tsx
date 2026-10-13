import { useMutation, useQuery } from "@apollo/client";
import { AlertCircle, ArrowDown, ArrowUpRight, CheckCircle2, Film, Search, Sparkles, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
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
  MY_PROFILE,
  RECOMMENDATIONS,
  ADD_MOVIE_TO_LIBRARY,
  ADD_MOVIE_TO_WATCHLIST,
  SAVED_MOVIES,
  TASTE_RECOMMENDATIONS,
  WATCHLIST
} from "../../shared/graphql/documents";
import styles from "./HomePage.module.css";

const recommendedCollections = [
  { label: "Для большого вечера", title: "Интерстеллар" },
  { label: "Держит в напряжении", title: "Остров проклятых" },
  { label: "Ещё одну серию", title: "Во все тяжкие" },
  { label: "Пересмотреть классику", title: "Матрица" }
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
  const { data: tasteData, loading: tasteLoading, error: tasteError } = useQuery<TasteRecommendationsData>(TASTE_RECOMMENDATIONS, { fetchPolicy: "cache-and-network" });
  const [addMovieToWatchlist] = useMutation(ADD_MOVIE_TO_WATCHLIST, {
    refetchQueries: [WATCHLIST, SAVED_MOVIES, TASTE_RECOMMENDATIONS, MY_PROFILE, RECOMMENDATIONS]
  });
  const [addMovieToLibrary] = useMutation(ADD_MOVIE_TO_LIBRARY, {
    refetchQueries: [SAVED_MOVIES, TASTE_RECOMMENDATIONS, MY_PROFILE, RECOMMENDATIONS]
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

  useEffect(() => {
    if (!watchlistMessage) return;
    const timeout = window.setTimeout(() => setWatchlistMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [watchlistMessage]);

  function searchByTitle(title: string) {
    setQuery(title);
    setAreSuggestionsOpen(false);
    searchMovies({ variables: { query: title, filters, sort } });
  }

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
              <span className={styles.eyebrow}><Film size={15} aria-hidden /> ВАША ЛИЧНАЯ КИНОТЕКА</span>
              <h1>Хорошее кино.<br /><em>Ваш выбор.</em></h1>
              <p>
                Находите фильмы и сериалы, собирайте любимое в коллекции
                и выбирайте, что посмотреть сегодня.
              </p>

              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <div className={styles.searchInputWrap}>
                  <Search size={20} aria-hidden />
                  <input
                    type="search"
                    autoComplete="off"
                    onKeyDown={(event) => { if (event.key === "Escape") setAreSuggestionsOpen(false); }}
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
                  {loading ? "Ищем…" : "Найти"}
                  <ArrowUpRight size={18} aria-hidden />
                </button>
              </form>

              <div className={styles.searchHint}><span>По названию · На русском и английском</span><ArrowDown size={14} aria-hidden /></div>

              {emptyQuery ? (
                <p className={styles.inlineError}>
                  <AlertCircle size={17} aria-hidden />
                  Введите название фильма или сериала.
                </p>
              ) : null}
            </div>

            <aside className={styles.recommendations} aria-label="Идеи для просмотра">
              <div className={styles.recommendationHeader}>
                <Sparkles size={18} aria-hidden />
                НАСТРОЕНИЕ ВЕЧЕРА
              </div>
              <h2>С чего начнём?</h2>
              <p>Немного вдохновения для следующего просмотра.</p>
              <div className={styles.collectionChips}>
                {recommendedCollections.map((collection, index) => (
                  <button key={collection.title} type="button" onClick={() => searchByTitle(collection.title)}>
                    <span className={styles.ideaNumber}>0{index + 1}</span>
                    <span><strong>{collection.label}</strong><small>{collection.title}</small></span>
                    <ArrowUpRight size={18} aria-hidden />
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="container">
        <section className={styles.tasteSection} aria-label="Рекомендации для вас">
          <div className={styles.tasteHeader}>
            <div><span><UsersRound size={17} aria-hidden /> Ваш вкус и оценки зрителей</span><h2>Рекомендуем посмотреть</h2></div>
            <Link className="buttonSecondary" to="/recommendations">Все рекомендации <ArrowUpRight size={16} aria-hidden /></Link>
          </div>
          {tasteLoading && !tasteData ? <p className={styles.recommendationState} role="status">Подбираем фильмы…</p> : null}
          {tasteError ? <p className={styles.recommendationState}>Не удалось загрузить рекомендации. Попробуйте открыть раздел «Для вас» ещё раз.</p> : null}
          {!tasteLoading && !tasteError && !tasteRecommendations.length ? <div className={styles.recommendationState}><p>Оцените фильмы в библиотеке, чтобы мы узнали ваш вкус. Здесь появятся новые истории на основе оценок зрителей.</p><Link to="/library">Перейти в библиотеку <ArrowUpRight size={15} aria-hidden /></Link></div> : null}
          <div className={styles.tasteGrid}>
            {tasteRecommendations.slice(0, 4).map((recommendation) => (
              <article className={styles.tasteCard} key={recommendation.movie.id}>
                <MovieCard movie={recommendation.movie} onAdd={setSelectedMovie} onLibrary={handleLibrary} onWatchlist={handleWatchlist} />
                <div className={styles.tasteReason}><strong>{recommendation.reason}</strong><small>Зрители {recommendation.ratingSource}: {recommendation.viewerRating.toFixed(1)}/10 · {recommendation.ratingCount} оценок</small></div>
              </article>
            ))}
          </div>
        </section>

        <MovieFiltersBar filters={filters} sort={sort} onFiltersChange={setFilters} onSortChange={setSort} />

        <div className={styles.resultsHeader}>
          <div>
            <h2>Результаты поиска</h2>
            <p>{called ? `${movies.length} найдено · Сохраните то, что хочется посмотреть` : "Ваша следующая любимая история начинается здесь"}</p>
          </div>
          <button className="buttonSecondary" type="button" onClick={() => searchByTitle("Матрица")}>
            <Sparkles size={16} aria-hidden />
            Попробовать «Матрицу»
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
