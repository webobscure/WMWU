import { MessageSquare, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { getMovieTitle, type Review } from "../../entities/movie/types";
import styles from "./ReviewCard.module.css";

type Props = { review: Review; showMovie?: boolean };

export function ReviewCard({ review, showMovie = false }: Props) {
  return (
    <article className={styles.card}>
      {showMovie ? (
        <Link className={styles.movie} to={`/movies/${encodeURIComponent(review.movie.externalId)}`}>
          <MessageSquare size={15} aria-hidden /> {getMovieTitle(review.movie)}
        </Link>
      ) : null}
      <div className={styles.header}>
        <Link className={styles.author} to={`/users/${encodeURIComponent(review.author.id)}`}>
          <span className={styles.avatar} aria-hidden>{review.author.name.slice(0, 1).toUpperCase()}</span>
          <span><strong>{review.author.name}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("ru-RU")}</time></span>
        </Link>
        <span className={styles.rating}><Star size={15} aria-hidden /> {review.rating !== null ? `${review.rating}/10` : "Без оценки"}</span>
      </div>
      {review.hasSpoilers ? (
        <details className={styles.spoiler}><summary>Показать отзыв со спойлерами</summary><p>{review.text}</p></details>
      ) : <p className={styles.text}>{review.text}</p>}
      {review.updatedAt !== review.createdAt ? <small className={styles.edited}>Отредактировано</small> : null}
    </article>
  );
}
