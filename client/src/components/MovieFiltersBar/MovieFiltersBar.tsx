import { ListFilter, RotateCcw } from "lucide-react";
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
  function updateFilter<Key extends keyof MovieFilters>(key: Key, value: MovieFilters[Key]) {
    onFiltersChange({
      ...filters,
      [key]: value || null
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        <ListFilter size={18} aria-hidden />
        Фильтры
      </div>

      <label>
        <span>Год от</span>
        <input
          className="field"
          type="number"
          min="1888"
          max="2100"
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

      <button className="iconButton" type="button" onClick={() => onFiltersChange(emptyFilters)} aria-label="Сбросить фильтры" title="Сбросить">
        <RotateCcw size={17} aria-hidden />
      </button>
    </div>
  );
}
