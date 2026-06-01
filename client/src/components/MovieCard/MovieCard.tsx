import { BookOpen, BookmarkPlus, ExternalLink, Star, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { getMediaTypeLabel, getMovieTitle, type MovieSearchResult } from "../../entities/movie/types";
import styles from "./MovieCard.module.css";

type Props = {
  movie: MovieSearchResult;
  onAdd: (movie: MovieSearchResult) => void;
  onLibrary?: (movie: MovieSearchResult) => void;
  onWatchlist?: (movie: MovieSearchResult) => void;
  showAddButton?: boolean;
  showLibraryButton?: boolean;
  showWatchlistButton?: boolean;
};

export function MovieCard({
  movie,
  onAdd,
  onLibrary,
  onWatchlist,
  showAddButton = true,
  showLibraryButton = true,
  showWatchlistButton = true
}: Props) {
  const title = getMovieTitle(movie);

  return (
    <article className={styles.card}>
      <Link to={`/movies/${encodeURIComponent(movie.externalId)}`} className={styles.posterLink}>
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={`Постер: ${title}`} className={styles.poster} loading="lazy" />
        ) : (
          <div className={styles.posterFallback}>Нет постера</div>
        )}
      </Link>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span>{getMediaTypeLabel(movie.mediaType)}</span>
          {movie.rating ? (
            <span className={styles.rating}>
              <Star size={14} fill="currentColor" aria-hidden />
              {movie.rating}
            </span>
          ) : null}
        </div>

        <h3>{title}</h3>
        <p className={styles.original}>{movie.originalTitle || movie.titleEn || "Оригинальное название не указано"}</p>
        <p className={styles.year}>{movie.year ?? "Год не указан"}</p>

        <div className={styles.actions}>
          <Link
            className="iconButton"
            to={`/movies/${encodeURIComponent(movie.externalId)}`}
            aria-label={`Открыть ${title}`}
            title="Открыть"
          >
            <ExternalLink size={17} aria-hidden />
          </Link>
          {showAddButton ? (
            <button className="iconButton" type="button" onClick={() => onAdd(movie)} aria-label="Добавить в коллекцию">
              <BookmarkPlus size={19} aria-hidden />
            </button>
          ) : null}
          {showLibraryButton && onLibrary ? (
            <button className="iconButton" type="button" onClick={() => onLibrary(movie)} aria-label="Добавить в библиотеку">
              <BookOpen size={19} aria-hidden />
            </button>
          ) : null}
          {showWatchlistButton && onWatchlist ? (
            <button className="iconButton" type="button" onClick={() => onWatchlist(movie)} aria-label="Хочу посмотреть">
              <Timer size={19} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
