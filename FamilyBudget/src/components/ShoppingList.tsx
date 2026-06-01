import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AppState, Category, ShoppingItem } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../utils/categories';
import { formatMoney } from '../utils/currency';

interface ShoppingListProps {
  state: AppState;
  onAdd: (item: Omit<ShoppingItem, 'id' | 'purchased'>) => void;
  onUpdate: (id: string, patch: Partial<ShoppingItem>) => void;
  onRemove: (id: string) => void;
}

export function ShoppingList({ state, onAdd, onUpdate, onRemove }: ShoppingListProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [quantity, setQuantity] = useState('1');
  const [plannedPrice, setPlannedPrice] = useState('');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

  const { currency } = state.settings;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      category,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      plannedPrice: Number(plannedPrice.replace(/\s/g, '').replace(',', '.')) || 0,
      plannedDate,
    });
    setName('');
    setPlannedPrice('');
    setQuantity('1');
  };

  const items = state.shoppingList.filter((item) => {
    if (filter === 'pending') return !item.purchased;
    if (filter === 'done') return item.purchased;
    return true;
  });

  const pendingSum = state.shoppingList
    .filter((i) => !i.purchased)
    .reduce((s, i) => s + i.plannedPrice * i.quantity, 0);

  return (
    <div className="shopping">
      <section className="card">
        <h2>Список покупок</h2>
        <p className="card__desc">
          Запланировано на {formatMoney(pendingSum, currency)} — отмечайте купленное, чтобы обновить бюджет.
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Что купить"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            placeholder="Кол-во"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Цена"
            value={plannedPrice}
            onChange={(e) => setPlannedPrice(e.target.value)}
          />
          <input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
          <button type="submit" className="btn btn--primary">Добавить</button>
        </form>
      </section>

      <div className="filter-tabs">
        {(['pending', 'done', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-tabs__btn ${filter === f ? 'filter-tabs__btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? 'Купить' : f === 'done' ? 'Куплено' : 'Все'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="empty-state">Список пуст для этого фильтра.</p>
      ) : (
        <ul className="shopping-items">
          {items.map((item) => (
            <li key={item.id} className={item.purchased ? 'shopping-item shopping-item--done' : 'shopping-item'}>
              <label className="shopping-item__check">
                <input
                  type="checkbox"
                  checked={item.purchased}
                  onChange={(e) => onUpdate(item.id, { purchased: e.target.checked })}
                />
                <span className="shopping-item__checkmark" />
              </label>
              <div className="shopping-item__body">
                <span className="shopping-item__name">{item.name}</span>
                <span className="shopping-item__meta">
                  {CATEGORY_LABELS[item.category]} · {item.quantity} шт. ·{' '}
                  {new Date(item.plannedDate + 'T12:00:00').toLocaleDateString('ru-RU')}
                </span>
              </div>
              <strong className="shopping-item__price">
                {formatMoney(item.plannedPrice * item.quantity, currency)}
              </strong>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onRemove(item.id)}
                aria-label="Удалить"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
