import type { ReactNode } from 'react';
import type { ViewId } from '../types';

const NAV: { id: ViewId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Обзор', icon: '◉' },
  { id: 'compare', label: 'Сравнение цен', icon: '⇄' },
  { id: 'list', label: 'Список покупок', icon: '☑' },
  { id: 'calendar', label: 'Календарь', icon: '▦' },
];

interface LayoutProps {
  view: ViewId;
  onViewChange: (view: ViewId) => void;
  children: ReactNode;
}

export function Layout({ view, onViewChange, children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header__brand">
          <span className="header__logo" aria-hidden>🏠</span>
          <div>
            <h1 className="header__title">Семейный бюджет</h1>
            <p className="header__subtitle">Планируйте покупки и выбирайте лучшую цену</p>
          </div>
        </div>
        <nav className="nav" aria-label="Разделы">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav__btn ${view === item.id ? 'nav__btn--active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <span className="nav__icon" aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
