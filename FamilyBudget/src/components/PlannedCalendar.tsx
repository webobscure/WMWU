import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState, ShoppingItem } from '../types';
import { formatMoney } from '../utils/currency';

interface PlannedCalendarProps {
  state: AppState;
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PlannedCalendar({ state }: PlannedCalendarProps) {
  const [current, setCurrent] = useState(new Date());
  const { currency } = state.settings;

  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const byDate = state.shoppingList.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    if (!acc[item.plannedDate]) acc[item.plannedDate] = [];
    acc[item.plannedDate].push(item);
    return acc;
  }, {});

  const days: ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    days.push(<div key={`e-${i}`} className="cal-day cal-day--empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = formatLocalDate(date);
    const dayItems = byDate[key] ?? [];
    const total = dayItems.reduce((s, i) => s + i.plannedPrice * i.quantity, 0);
    const isToday = formatLocalDate(new Date()) === key;

    days.push(
      <div key={day} className={`cal-day ${isToday ? 'cal-day--today' : ''}`}>
        <span className="cal-day__num">{day}</span>
        {total > 0 && (
          <span className="cal-day__total">{formatMoney(total, currency)}</span>
        )}
        <div className="cal-day__items">
          {dayItems.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className={item.purchased ? 'cal-chip cal-chip--done' : 'cal-chip'}
              title={item.name}
            >
              {item.name}
            </span>
          ))}
          {dayItems.length > 3 && (
            <span className="cal-chip cal-chip--more">+{dayItems.length - 3}</span>
          )}
        </div>
      </div>,
    );
  }

  const navigate = (delta: number) => {
    const next = new Date(current);
    next.setMonth(next.getMonth() + delta);
    setCurrent(next);
  };

  return (
    <div className="calendar-page">
      <section className="card">
        <div className="calendar-toolbar">
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)} aria-label="Предыдущий месяц">
            ←
          </button>
          <h2>{MONTHS[month]} {year}</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(1)} aria-label="Следующий месяц">
            →
          </button>
        </div>
        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">{days}</div>
      </section>
    </div>
  );
}
