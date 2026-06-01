import { useMutation } from "@apollo/client";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { UserMovie, WatchStatus } from "../../entities/movie/types";
import { watchStatusLabels } from "../../entities/movie/types";
import { SAVED_MOVIES, UPDATE_MOVIE_PROGRESS } from "../../shared/graphql/documents";
import styles from "./MovieProgressEditor.module.css";

type Props = {
  entry: UserMovie;
};

const statuses = Object.entries(watchStatusLabels) as [WatchStatus, string][];

export function MovieProgressEditor({ entry }: Props) {
  const [status, setStatus] = useState<WatchStatus>(entry.status);
  const [personalRating, setPersonalRating] = useState(entry.personalRating?.toString() ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [saved, setSaved] = useState(false);
  const [updateMovieProgress, updateState] = useMutation(UPDATE_MOVIE_PROGRESS, {
    refetchQueries: [SAVED_MOVIES]
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rating = personalRating.trim() ? Number(personalRating) : null;

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
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        Статус
        <select value={status} onChange={(event) => setStatus(event.target.value as WatchStatus)}>
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
          onChange={(event) => setPersonalRating(event.target.value)}
          placeholder="1-10"
        />
      </label>

      <label className={styles.note}>
        Заметка
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Что запомнилось, с кем смотрели, стоит ли пересматривать"
        />
      </label>

      <button className="buttonSecondary" type="submit" disabled={updateState.loading}>
        <Save size={17} aria-hidden />
        {saved ? "Сохранено" : "Сохранить"}
      </button>
    </form>
  );
}
