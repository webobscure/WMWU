import { useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, BookOpen, BookmarkPlus, CheckCircle2, Clock, Globe2, Star, Timer, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddToCollectionModal } from "../../components/AddToCollectionModal/AddToCollectionModal";
import { MovieProgressEditor } from "../../components/MovieProgressEditor/MovieProgressEditor";
import { getMediaTypeLabel, getMovieTitle, toMovieInput, type MovieDetails, type UserMovie } from "../../entities/movie/types";
import {
  ADD_MOVIE_TO_LIBRARY,
  ADD_MOVIE_TO_WATCHLIST,
  MOVIE_DETAILS,
  MOVIE_PROGRESS_BY_EXTERNAL_ID,
  SAVED_MOVIES,
  WATCHLIST
} from "../../shared/graphql/documents";
import styles from "./MoviePage.module.css";

type MovieDetailsData = {
  movieDetails: MovieDetails | null;
};

type MovieProgressData = {
  movieProgressByExternalId: UserMovie | null;
};

export function MoviePage() {
  const { movieId = "" } = useParams();
  const decodedMovieId = decodeURIComponent(movieId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const { data, loading, error } = useQuery<MovieDetailsData>(MOVIE_DETAILS, {
    variables: { id: decodedMovieId },
    skip: !decodedMovieId
  });
  const [addMovieToWatchlist, watchlistState] = useMutation(ADD_MOVIE_TO_WATCHLIST, {
    refetchQueries: [WATCHLIST, SAVED_MOVIES]
  });
  const [addMovieToLibrary, libraryState] = useMutation(ADD_MOVIE_TO_LIBRARY, {
    refetchQueries: [SAVED_MOVIES]
  });
  const movie = data?.movieDetails ?? null;
  const movieInput = useMemo(() => (movie ? toMovieInput(movie) : null), [movie]);
  const { data: progressData, refetch: refetchProgress } = useQuery<MovieProgressData>(MOVIE_PROGRESS_BY_EXTERNAL_ID, {
    variables: { externalId: movie?.externalId ?? "" },
    skip: !movie?.externalId
  });
  const progress = progressData?.movieProgressByExternalId ?? null;

  if (loading) {
    return (
      <section className="container">
        <div className={styles.loading}>Загружаем страницу фильма...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container">
        <div className={styles.state}>
          <h1>Не удалось загрузить фильм</h1>
          <p>{error.message}</p>
          <Link className="buttonSecondary" to="/">
            <ArrowLeft size={18} aria-hidden />
            Вернуться к поиску
          </Link>
        </div>
      </section>
    );
  }

  if (!movie) {
    return (
      <section className="container">
        <div className={styles.state}>
          <h1>Фильм не найден</h1>
          <Link className="buttonSecondary" to="/">
            <ArrowLeft size={18} aria-hidden />
            Вернуться к поиску
          </Link>
        </div>
      </section>
    );
  }

  const title = getMovieTitle(movie);

  async function handleWatchlist() {
    if (!movieInput) {
      return;
    }

    await addMovieToWatchlist({
      variables: {
        movieInput
      }
    });
    setWatchlistMessage("Добавлено в список");
  }

  async function handleLibrary() {
    if (!movieInput) {
      return;
    }

    await addMovieToLibrary({
      variables: {
        movieInput
      }
    });
    await refetchProgress();
    setWatchlistMessage("Добавлено в библиотеку");
  }

  return (
    <>
      <section className={styles.page}>
        <div className="container">
          <Link className={styles.backLink} to="/">
            <ArrowLeft size={18} aria-hidden />
            Назад к поиску
          </Link>

          <div className={styles.detailsGrid}>
            <div className={styles.posterPanel}>
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt={`Постер: ${title}`} />
              ) : (
                <div>Нет постера</div>
              )}
            </div>

            <article className={styles.content}>
              <div className={styles.typeRow}>
                <span>{getMediaTypeLabel(movie.mediaType)}</span>
                {movie.rating ? (
                  <span>
                    <Star size={17} fill="currentColor" aria-hidden />
                    {movie.rating}
                  </span>
                ) : null}
              </div>

              <h1>{title}</h1>
              <p className={styles.original}>{movie.originalTitle || movie.titleEn}</p>
              <p className={styles.description}>{movie.description || "Описание пока недоступно."}</p>

              <dl className={styles.facts}>
                <div>
                  <dt>Год</dt>
                  <dd>{movie.year ?? "Не указан"}</dd>
                </div>
                <div>
                  <dt>
                    <Globe2 size={17} aria-hidden />
                    Страна
                  </dt>
                  <dd>{movie.country || "Не указана"}</dd>
                </div>
                <div>
                  <dt>
                    <Clock size={17} aria-hidden />
                    Длительность
                  </dt>
                  <dd>{movie.duration ? `${movie.duration} мин` : "Не указана"}</dd>
                </div>
              </dl>

              <div className={styles.sectionBlock}>
                <h2>Жанры</h2>
                <div className={styles.chips}>
                  {movie.genres.length > 0 ? movie.genres.map((genre) => <span key={genre}>{genre}</span>) : <span>Не указаны</span>}
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <h2>
                  <Users size={20} aria-hidden />
                  Актеры
                </h2>
                <p>{movie.actors.length > 0 ? movie.actors.join(", ") : "Список актеров недоступен."}</p>
              </div>

              <div className={styles.actions}>
                <button className="buttonPrimary" type="button" onClick={() => setIsModalOpen(true)}>
                  <BookmarkPlus size={18} aria-hidden />
                  Добавить в коллекцию
                </button>
                <button
                  className="buttonSecondary"
                  type="button"
                  disabled={libraryState.loading}
                  onClick={handleLibrary}
                >
                  <BookOpen size={18} aria-hidden />
                  В библиотеку
                </button>
                <button
                  className="buttonSecondary"
                  type="button"
                  disabled={watchlistState.loading}
                  onClick={handleWatchlist}
                >
                  <Timer size={18} aria-hidden />
                  Хочу посмотреть
                </button>
              </div>

              {progress ? (
                <div className={styles.progressBlock}>
                  <h2>Мой рейтинг и заметка</h2>
                  <MovieProgressEditor entry={progress} />
                </div>
              ) : null}
            </article>
          </div>
        </div>
      </section>

      {watchlistMessage ? (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={18} aria-hidden />
          {watchlistMessage}
        </div>
      ) : null}

      <AddToCollectionModal
        movie={isModalOpen ? movie : null}
        movieInput={isModalOpen ? movieInput : null}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
