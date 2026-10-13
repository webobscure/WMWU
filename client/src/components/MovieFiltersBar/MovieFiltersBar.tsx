import { ChevronDown, ListFilter, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { MovieFilters, MovieSort } from "../../entities/movie/types";
import styles from "./MovieFiltersBar.module.css";

type Props = {
  filters: MovieFilters;
  sort: MovieSort;
  onFiltersChange: (filters: MovieFilters) => void;
  onSortChange: (sort: MovieSort) => void;
};

const emptyFilters: MovieFilters = {};

export function MovieFiltersBar({ filters, sort, onFiltersChange, onSortChange }: Props) {
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 761px)").matches);
  const activeCount = Object.values(filters).filter((value) => value !== null && value !== undefined && value !== "").length;

  function updateFilter<Key extends keyof MovieFilters>(key: Key, value: MovieFilters[Key]) {
    onFiltersChange({
      ...filters,
      [key]: value || null
    });
  }

  return (
    <details className={styles.disclosure} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={styles.summary}>
        <span className={styles.title}><ListFilter size={17} aria-hidden /> Фильтры и сортировка</span>
        {activeCount > 0 ? <span className={styles.badge}>{activeCount}</span> : null}
        <ChevronDown size={17} className={styles.chevron} aria-hidden />
      </summary>
      <div className={styles.panel}>

        <label>
          <span>Год от</span>
          <input
            className="field"
            type="number"
            min="1888"
            max="2100"
            placeholder="1990"
            value={filters.yearFrom ?? ""}
            onChange={(event) => updateFilter("yearFrom", event.target.value ? Number(event.target.value) : null)}
          />
        </label>

        <label>
          <span>Год до</span>
          <input
            className="field"
            type="number"
            min="1888"
            max="2100"
            placeholder="2026"
            value={filters.yearTo ?? ""}
            onChange={(event) => updateFilter("yearTo", event.target.value ? Number(event.target.value) : null)}
          />
        </label>

        <label>
          <span>Жанр</span>
          <input
            className="field"
            value={filters.genre ?? ""}
            onChange={(event) => updateFilter("genre", event.target.value)}
            placeholder="триллер"
          />
        </label>

        <label>
          <span>Тип</span>
          <select
            className="field"
            value={filters.mediaType ?? ""}
            onChange={(event) => updateFilter("mediaType", event.target.value as MovieFilters["mediaType"])}
          >
            <option value="">Все</option>
            <option value="movie">Фильм</option>
            <option value="series">Сериал</option>
          </select>
        </label>

        <label>
          <span>Рейтинг от</span>
          <input
            className="field"
            type="number"
            min="0"
            max="10"
            step="0.1"
            placeholder="7.0"
            value={filters.ratingFrom ?? ""}
            onChange={(event) => updateFilter("ratingFrom", event.target.value ? Number(event.target.value) : null)}
          />
        </label>

        <label>
          <span>Страна</span>
          <input
            className="field"
            value={filters.country ?? ""}
            onChange={(event) => updateFilter("country", event.target.value)}
            placeholder="Россия"
          />
        </label>

        <label>
          <span>Сортировка</span>
          <select
            className="field"
            value={`${sort.field}:${sort.direction}`}
            onChange={(event) => {
              const [field, direction] = event.target.value.split(":") as [MovieSort["field"], MovieSort["direction"]];
              onSortChange({ field, direction });
            }}
          >
            <option value="ADDED_AT:DESC">Дата добавления</option>
            <option value="RATING:DESC">Рейтинг</option>
            <option value="YEAR:DESC">Год</option>
            <option value="TITLE:ASC">Название</option>
          </select>
        </label>

        <button className={`buttonSecondary ${styles.reset}`} type="button" onClick={() => onFiltersChange(emptyFilters)} aria-label="Сбросить фильтры" title="Сбросить фильтры">
          <RotateCcw size={17} aria-hidden /><span>Сбросить</span>
        </button>
      </div>
    </details>
  );
}
