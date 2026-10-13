import { NetworkStatus, useMutation, useQuery } from "@apollo/client";
import { MessageSquare, Send, Star, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { MovieFeedback } from "../../entities/movie/types";
import { DELETE_REVIEW, MOVIE_FEEDBACK, MOVIE_PROGRESS_BY_EXTERNAL_ID, MY_PROFILE, PUBLISH_REVIEW, RECOMMENDATIONS, SAVED_MOVIES, TASTE_RECOMMENDATIONS, USER_PROFILE } from "../../shared/graphql/documents";
import { ReviewCard } from "../ReviewCard/ReviewCard";
import styles from "./MovieReviews.module.css";

type FeedbackData = { movieFeedback: MovieFeedback };
const refreshQueries = [MOVIE_FEEDBACK, SAVED_MOVIES, MOVIE_PROGRESS_BY_EXTERNAL_ID, MY_PROFILE, USER_PROFILE, RECOMMENDATIONS, TASTE_RECOMMENDATIONS];

function ReviewForm({ externalId, feedback }: { externalId: string; feedback: MovieFeedback }) {
  const [rating, setRating] = useState(feedback.myRating?.toString() ?? "");
  const [text, setText] = useState(feedback.myReview?.text ?? "");
  const [hasSpoilers, setHasSpoilers] = useState(feedback.myReview?.hasSpoilers ?? false);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [publish, publishState] = useMutation(PUBLISH_REVIEW, { refetchQueries: refreshQueries, awaitRefetchQueries: true });
  const [remove, removeState] = useMutation(DELETE_REVIEW, { refetchQueries: refreshQueries, awaitRefetchQueries: true });
  const error = publishState.error ?? removeState.error;
  const pending = publishState.loading || removeState.loading;

  useEffect(() => {
    if (isDirty) return;
    setRating(feedback.myRating?.toString() ?? "");
    setText(feedback.myReview?.text ?? "");
    setHasSpoilers(feedback.myReview?.hasSpoilers ?? false);
  }, [feedback.myRating, feedback.myReview?.text, feedback.myReview?.hasSpoilers, isDirty]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); removeState.reset();
    try {
      await publish({ variables: { externalId, input: { rating: Number(rating), text: text.trim(), hasSpoilers } } });
      setIsDirty(false);
      setMessage("Отзыв опубликован. Ваша оценка учтена в рейтинге зрителей.");
    } catch { /* Mutation state displays the error and keeps the draft. */ }
  }

  async function deleteOwnReview() {
    if (!feedback.myReview) return;
    setMessage(""); publishState.reset();
    try {
      await remove({ variables: { id: feedback.myReview.id } });
      setIsDirty(false); setText(""); setHasSpoilers(false); setMessage("Отзыв удалён. Личная оценка сохранена.");
    } catch { /* Mutation state displays the error. */ }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formHeader}><h3>{feedback.myReview ? "Ваш отзыв" : "Поделитесь впечатлениями"}</h3><span>{isDirty ? "Изменения ещё не опубликованы" : "Ваша оценка влияет на рекомендации"}</span></div>
      <label className={styles.ratingLabel}>Ваша оценка
        <select className="field" aria-label="Ваша оценка" value={rating} required onChange={(event) => { setRating(event.target.value); setIsDirty(true); setMessage(""); }}>
          <option value="" disabled>Выберите оценку</option>
          {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} из 10</option>)}
        </select>
      </label>
      <label className={styles.textLabel}>Отзыв
        <textarea className="textarea" value={text} minLength={10} maxLength={4000} required onChange={(event) => { setText(event.target.value); setIsDirty(true); setMessage(""); }} placeholder="Что понравилось, что запомнилось и кому вы бы посоветовали этот фильм?" />
      </label>
      <div className={styles.formMeta}><label className={styles.checkbox}><input type="checkbox" checked={hasSpoilers} onChange={(event) => { setHasSpoilers(event.target.checked); setIsDirty(true); setMessage(""); }} /> Есть спойлеры</label><span>{text.length} / 4000</span></div>
      <p className={styles.hint}>Отзыв будет виден другим зрителям. Личные заметки в библиотеке остаются вашими.</p>
      {error ? <p className={styles.error} role="alert">{error.message}</p> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}
      <div className={styles.formActions}>
        <button className="buttonPrimary" type="submit" disabled={pending || !rating || text.trim().length < 10}><Send size={16} aria-hidden /> {pending ? "Сохраняем…" : feedback.myReview ? "Сохранить отзыв" : "Опубликовать отзыв"}</button>
        {feedback.myReview ? <button className="buttonDanger" type="button" disabled={pending} onClick={() => void deleteOwnReview()}><Trash2 size={16} aria-hidden /> Удалить отзыв</button> : null}
      </div>
    </form>
  );
}

export function MovieReviews({ externalId }: { externalId: string }) {
  const { data, loading, error, refetch, fetchMore, networkStatus } = useQuery<FeedbackData>(MOVIE_FEEDBACK, {
    variables: { externalId, offset: 0 }, notifyOnNetworkStatusChange: true, fetchPolicy: "cache-and-network"
  });
  const [pageError, setPageError] = useState("");
  const feedback = data?.movieFeedback;

  async function loadMore() {
    if (!feedback) return;
    setPageError("");
    try {
      await fetchMore({
        variables: { offset: feedback.reviews.length },
        updateQuery: (previous, { fetchMoreResult }) => fetchMoreResult ? ({
          movieFeedback: { ...fetchMoreResult.movieFeedback, reviews: [...previous.movieFeedback.reviews, ...fetchMoreResult.movieFeedback.reviews] }
        }) : previous
      });
    } catch { setPageError("Не удалось загрузить отзывы. Попробуйте ещё раз."); }
  }

  return (
    <section className={styles.section} aria-label="Оценки и отзывы зрителей">
      <div className={styles.heading}><div><span><MessageSquare size={16} aria-hidden /> МНЕНИЕ ЗРИТЕЛЕЙ</span><h2>Оценки и отзывы</h2></div>{feedback ? <small>{feedback.reviewCount} отзывов</small> : null}</div>
      {!feedback && loading ? <div className={styles.state} role="status">Загружаем отзывы…</div> : null}
      {!feedback && error ? <div className={styles.state}><p>Не удалось загрузить отзывы.</p><button className="buttonSecondary" type="button" onClick={() => void refetch().catch(() => undefined)}>Повторить</button></div> : null}
      {feedback ? (
        <>
          <div className={styles.summary}>
            <div className={styles.score}><Star size={20} aria-hidden /><strong>{feedback.averageRating?.toFixed(1) ?? "—"}<small> / 10</small></strong><span>{feedback.ratingCount ? `${feedback.ratingCount} оценок зрителей WMWU` : "Пока нет оценок"}</span><p>Каждый зритель — один голос. Рейтинг обновляется вместе с личными оценками.</p></div>
            <div className={styles.distribution} aria-label="Распределение оценок">
              {[...feedback.distribution].reverse().map((bucket) => <div key={bucket.rating} aria-label={`${bucket.rating} из 10: ${bucket.count} оценок`}><span>{bucket.rating}</span><span className={styles.track}><span style={{ width: `${feedback.ratingCount ? bucket.count / feedback.ratingCount * 100 : 0}%` }} /></span><small>{bucket.count}</small></div>)}
            </div>
          </div>
          <ReviewForm externalId={externalId} feedback={feedback} />
          <div className={styles.list}>{feedback.reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
          {feedback.reviews.length === 0 ? <div className={styles.state}><MessageSquare size={24} aria-hidden /><p>Пока никто не поделился впечатлениями. Напишите первый отзыв.</p></div> : null}
          {pageError ? <p className={styles.error} role="alert">{pageError}</p> : null}
          {feedback.hasMore ? <button className={`buttonSecondary ${styles.more}`} type="button" disabled={networkStatus === NetworkStatus.fetchMore} onClick={() => void loadMore()}>{networkStatus === NetworkStatus.fetchMore ? "Загружаем…" : "Ещё отзывы"}</button> : null}
        </>
      ) : null}
    </section>
  );
}
