import { useMutation } from "@apollo/client";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { UserMovie, WatchStatus } from "../../entities/movie/types";
import { watchStatusLabels } from "../../entities/movie/types";
import { MOVIE_FEEDBACK, MY_PROFILE, RECOMMENDATIONS, TASTE_RECOMMENDATIONS, SAVED_MOVIES, UPDATE_MOVIE_PROGRESS } from "../../shared/graphql/documents";
import styles from "./MovieProgressEditor.module.css";

type Props = {
  entry: UserMovie;
};

const statuses = Object.entries(watchStatusLabels) as [WatchStatus, string][];

export function MovieProgressEditor({ entry }: Props) {
  const [status, setStatus] = useState<WatchStatus>(entry.status);
  const [personalRating, setPersonalRating] = useState(entry.personalRating?.toString() ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updateMovieProgress, updateState] = useMutation(UPDATE_MOVIE_PROGRESS, {
    refetchQueries: [SAVED_MOVIES, MOVIE_FEEDBACK, MY_PROFILE, RECOMMENDATIONS, TASTE_RECOMMENDATIONS],
    awaitRefetchQueries: true
  });

  useEffect(() => {
    if (isDirty) return;
    setStatus(entry.status);
    setPersonalRating(entry.personalRating?.toString() ?? "");
    setNote(entry.note ?? "");
  }, [entry.status, entry.personalRating, entry.note, isDirty]);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rating = personalRating.trim() ? Number(personalRating) : null;

    try {
      await updateMovieProgress({
        variables: {
          movieId: entry.movie.id,
          input: {
            status,
            personalRating: Number.isFinite(rating) ? rating : null,
            note: note.trim() || null,
            watchedAt: status === "WATCHED" ? new Date().toISOString() : null
          }
        }
      });
      setIsDirty(false);
      setSaved(true);
    } catch { /* Mutation state displays the error without losing edits. */ }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        Статус
        <select value={status} onChange={(event) => { setStatus(event.target.value as WatchStatus); setIsDirty(true); setSaved(false); }}>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Моя оценка
        <input
          type="number"
          min="1"
          max="10"
          value={personalRating}
          onChange={(event) => { setPersonalRating(event.target.value); setIsDirty(true); setSaved(false); }}
          placeholder="1-10"
        />
      </label>

      <label className={styles.note}>
        Заметка
        <textarea
          value={note}
          onChange={(event) => { setNote(event.target.value); setIsDirty(true); setSaved(false); }}
          placeholder="Что запомнилось, с кем смотрели, стоит ли пересматривать"
        />
      </label>

      {updateState.error ? <p className={styles.error} role="alert">{updateState.error.message}</p> : null}
      <button className="buttonSecondary" type="submit" disabled={updateState.loading}>
        <Save size={17} aria-hidden />
        {saved ? "Сохранено" : "Сохранить"}
      </button>
    </form>
  );
}
