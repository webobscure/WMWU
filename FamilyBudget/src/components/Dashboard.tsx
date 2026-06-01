import type { AppState } from '../types';
import { CATEGORY_LABELS } from '../utils/categories';
import { formatMoney } from '../utils/currency';

interface DashboardProps {
  state: AppState;
  onUpdateBudget: (budget: number) => void;
  onGoCompare: () => void;
}

export function Dashboard({ state, onUpdateBudget, onGoCompare }: DashboardProps) {
  const { settings, shoppingList, comparisons } = state;
  const { currency, monthlyBudget } = settings;

  const plannedTotal = shoppingList
    .filter((i) => !i.purchased)
    .reduce((sum, i) => sum + i.plannedPrice * i.quantity, 0);

  const spentTotal = shoppingList
    .filter((i) => i.purchased)
    .reduce((sum, i) => sum + i.plannedPrice * i.quantity, 0);

  const remaining = monthlyBudget - spentTotal - plannedTotal;
  const budgetUsedPct = monthlyBudget > 0 ? Math.min(100, ((spentTotal + plannedTotal) / monthlyBudget) * 100) : 0;

  const activeComparisons = comparisons.filter((c) => c.offers.length >= 2).length;
  const pendingItems = shoppingList.filter((i) => !i.purchased).length;

  const byCategory = shoppingList
    .filter((i) => !i.purchased)
    .reduce<Record<string, number>>((acc, item) => {
      const key = CATEGORY_LABELS[item.category];
      acc[key] = (acc[key] ?? 0) + item.plannedPrice * item.quantity;
      return acc;
    }, {});

  return (
    <div className="dashboard">
      <section className="card card--hero">
        <div className="card__header">
          <h2>Бюджет месяца</h2>
          <label className="budget-input">
            <span className="sr-only">Лимит бюджета</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={monthlyBudget || ''}
              onChange={(e) => onUpdateBudget(Number(e.target.value) || 0)}
            />
            <span>{currency}</span>
          </label>
        </div>
        <div className="budget-bar">
          <div
            className="budget-bar__fill"
            style={{ width: `${budgetUsedPct}%` }}
          />
        </div>
        <div className="stats-row">
          <div className="stat">
            <span className="stat__label">Потрачено</span>
            <span className="stat__value stat__value--spent">{formatMoney(spentTotal, currency)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Запланировано</span>
            <span className="stat__value">{formatMoney(plannedTotal, currency)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Остаток</span>
            <span className={`stat__value ${remaining < 0 ? 'stat__value--danger' : 'stat__value--ok'}`}>
              {formatMoney(remaining, currency)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>Быстрые цифры</h3>
          <ul className="quick-stats">
            <li>
              <span>Сравнений с 2+ ценами</span>
              <strong>{activeComparisons}</strong>
            </li>
            <li>
              <span>Покупок в списке</span>
              <strong>{pendingItems}</strong>
            </li>
            <li>
              <span>Всего сравнений</span>
              <strong>{comparisons.length}</strong>
            </li>
          </ul>
          <button type="button" className="btn btn--primary btn--block" onClick={onGoCompare}>
            Сравнить цены по ссылкам
          </button>
        </section>

        <section className="card">
          <h3>План по категориям</h3>
          {Object.keys(byCategory).length === 0 ? (
            <p className="empty-hint">Добавьте покупки в список — здесь появится разбивка.</p>
          ) : (
            <ul className="category-breakdown">
              {Object.entries(byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <li key={cat}>
                    <span>{cat}</span>
                    <strong>{formatMoney(amount, currency)}</strong>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card card--tip">
        <h3>Как пользоваться</h3>
        <ol className="tips">
          <li>В «Сравнение цен» добавьте товар и несколько ссылок с ценами — увидите среднюю и лучшее предложение.</li>
          <li>Добавьте выгодную покупку в список по средней цене одной кнопкой.</li>
          <li>Отмечайте купленное и следите за бюджетом на этой странице.</li>
        </ol>
      </section>
    </div>
  );
}
