import { useMutation, useQuery } from "@apollo/client";
import { ArrowUpRight, CheckCircle2, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AddToCollectionModal } from "../../components/AddToCollectionModal/AddToCollectionModal";
import { MovieCardSkeletons } from "../../components/Loading/Skeleton";
import { MovieCard } from "../../components/MovieCard/MovieCard";
import { toMovieInput, type MovieSearchResult, type TasteRecommendation } from "../../entities/movie/types";
import { ADD_MOVIE_TO_LIBRARY, ADD_MOVIE_TO_WATCHLIST, MY_PROFILE, RECOMMENDATIONS, SAVED_MOVIES, TASTE_RECOMMENDATIONS, WATCHLIST } from "../../shared/graphql/documents";
import styles from "./RecommendationsPage.module.css";

const labels = { PERSONAL_RATINGS: "По вашим оценкам", SIMILAR_TASTES: "Похожие вкусы", GENRES: "Любимые жанры", COMMUNITY: "Выбор зрителей" };

export function RecommendationsPage() {
  const { data, loading, error, refetch } = useQuery<{ recommendations: TasteRecommendation[] }>(RECOMMENDATIONS, { fetchPolicy: "cache-and-network" });
  const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const refresh = [MY_PROFILE, RECOMMENDATIONS, TASTE_RECOMMENDATIONS, SAVED_MOVIES, WATCHLIST];
  const [addLibrary] = useMutation(ADD_MOVIE_TO_LIBRARY, { refetchQueries: refresh });
  const [addWatchlist] = useMutation(ADD_MOVIE_TO_WATCHLIST, { refetchQueries: refresh });
  const recommendations = data?.recommendations ?? [];

  async function save(movie: MovieSearchResult, target: "library" | "watchlist") {
    setMessage(""); setActionError("");
    try {
      await (target === "library" ? addLibrary : addWatchlist)({ variables: { movieInput: toMovieInput(movie) } });
      setMessage(target === "library" ? "Фильм добавлен в библиотеку." : "Фильм добавлен в список «Хочу посмотреть».");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Не удалось сохранить фильм."); }
  }

  return (
    <section className={styles.page}><div className="container">
      <div className={styles.header}><span><Sparkles size={17} aria-hidden /> ПОДОБРАНО ДЛЯ ВАС</span><h1>Следующая хорошая история</h1><p>На основе ваших оценок, любимых жанров и впечатлений зрителей с похожим вкусом.</p><Link className={styles.headerLink} to="/library">Оценить фильмы в библиотеке <ArrowUpRight size={16} aria-hidden /></Link></div>
      <div className={styles.explanation}><Sparkles size={19} aria-hidden /><p>Когда оценок в WMWU мало, используем также рейтинги зрителей TMDB. Чем больше вы оцениваете, тем точнее подборка. Уже сохранённые фильмы в неё не попадают.</p></div>
      {message ? <p className={styles.success} role="status"><CheckCircle2 size={17} aria-hidden /> {message}</p> : null}
      {actionError ? <p className={styles.error} role="alert">{actionError}</p> : null}
      {error ? <div className={styles.state}><h2>Не удалось загрузить рекомендации</h2><button className="buttonSecondary" type="button" onClick={() => void refetch().catch(() => undefined)}>Повторить</button></div> : null}
      {!error && !loading && !recommendations.length ? <div className={styles.state}><Sparkles size={28} aria-hidden /><h2>Дадим вашему вкусу немного места</h2><p>Оцените фильмы в библиотеке. Если сейчас подходящих фильмов нет, попробуйте вернуться чуть позже.</p><Link className="buttonPrimary" to="/">Найти фильм</Link></div> : null}
      <div className={styles.grid}>
        {loading && !data ? <MovieCardSkeletons count={8} /> : null}
        {recommendations.map((recommendation) => <article className={styles.entry} key={recommendation.movie.id}>
          <MovieCard movie={recommendation.movie} onAdd={setSelectedMovie} onLibrary={(movie) => void save(movie, "library")} onWatchlist={(movie) => void save(movie, "watchlist")} />
          <div className={styles.reason}><span className={styles.mode}>{labels[recommendation.mode]}</span><p>{recommendation.reason}</p><div><Star size={14} aria-hidden /><strong>{recommendation.viewerRating.toFixed(1)}</strong><span>· {recommendation.ratingCount} оценок {recommendation.ratingSource}</span></div></div>
        </article>)}
      </div>
      <AddToCollectionModal movie={selectedMovie} movieInput={selectedMovie ? toMovieInput(selectedMovie) : null} onClose={() => setSelectedMovie(null)} />
    </div></section>
  );
}
