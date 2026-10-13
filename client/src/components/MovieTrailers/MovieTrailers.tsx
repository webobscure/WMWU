import { useQuery } from "@apollo/client";
import { ExternalLink, Film, Play, RotateCcw, X } from "lucide-react";
import { useId, useState } from "react";
import type { MovieTrailer } from "../../entities/movie/types";
import { MOVIE_TRAILERS } from "../../shared/graphql/documents";
import styles from "./MovieTrailers.module.css";

type Props = {
  externalId: string;
  movieTitle: string;
};

type TrailersData = {
  movieTrailers: MovieTrailer[];
};

function languageLabel(language: string | null) {
  if (language === "ru") return "Русский";
  if (language === "en") return "Английский";
  return language ? "Другой язык" : "Язык не указан";
}

export function MovieTrailers({ externalId, movieTitle }: Props) {
  const playerId = useId();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { data, loading, error, refetch } = useQuery<TrailersData>(MOVIE_TRAILERS, {
    variables: { id: externalId }
  });
  const trailers = data?.movieTrailers ?? [];
  const selectedTrailer = trailers.find((trailer) => trailer.key === selectedKey) ?? trailers[0];

  if (loading && !data) {
    return <p className={styles.state} role="status"><Film size={16} aria-hidden /> Ищем трейлеры…</p>;
  }

  if (error) {
    return (
      <div className={styles.error} role="status">
        <span>Не удалось загрузить трейлеры.</span>
        <button
          className="buttonSecondary"
          type="button"
          disabled={loading}
          onClick={() => void refetch().catch(() => undefined)}
        >
          <RotateCcw size={15} aria-hidden /> {loading ? "Загружаем…" : "Повторить"}
        </button>
      </div>
    );
  }

  if (!selectedTrailer) {
    return <p className={styles.state}><Film size={16} aria-hidden /> Трейлеры пока недоступны.</p>;
  }

  return (
    <section className={styles.section} aria-label={`Трейлеры: ${movieTitle}`}>
      <div className={styles.controls}>
        <button
          className="buttonPrimary"
          type="button"
          aria-expanded={isPlaying}
          aria-controls={playerId}
          onClick={() => setIsPlaying((current) => !current)}
        >
          {isPlaying ? <X size={17} aria-hidden /> : <Play size={17} aria-hidden />}
          {isPlaying ? "Скрыть трейлер" : "Смотреть трейлер"}
        </button>
        <span className={styles.meta}>
          {selectedTrailer.type === "Teaser" ? "Тизер" : "Трейлер"} · {languageLabel(selectedTrailer.language)}
          {selectedTrailer.official ? " · Официальный" : ""}
        </span>
      </div>

      {trailers.length > 1 ? (
        <label className={styles.selector}>
          <span>Выбрать трейлер</span>
          <select className="field" value={selectedTrailer.key} onChange={(event) => setSelectedKey(event.target.value)}>
            {trailers.map((trailer) => (
              <option key={trailer.key} value={trailer.key}>
                {trailer.name} — {languageLabel(trailer.language)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div id={playerId} hidden={!isPlaying}>
        {isPlaying ? (
          <>
            <div className={styles.player}>
              <iframe
                key={selectedTrailer.key}
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedTrailer.key)}?autoplay=1&playsinline=1&rel=0&hl=ru`}
                title={`${movieTitle} — ${selectedTrailer.name}`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className={styles.caption}>
              <span>{selectedTrailer.name}</span>
              <a
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(selectedTrailer.key)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть на YouTube <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
