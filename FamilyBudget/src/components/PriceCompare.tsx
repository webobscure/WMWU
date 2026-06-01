import { useState, type FormEvent } from 'react';
import type { AppState, Category, PriceComparison } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../utils/categories';
import { formatMoney } from '../utils/currency';
import { fetchPriceFromUrl } from '../utils/fetchPrice';
import { computePriceStats } from '../utils/priceStats';
import { parsePriceInput } from '../utils/parsePriceInput';
import { isValidUrl, parseStoreFromUrl } from '../utils/url';

interface PriceCompareProps {
  state: AppState;
  onAddComparison: (name: string, category: Category) => string;
  onRemoveComparison: (id: string) => void;
  onAddOffer: (comparisonId: string, offer: { url: string; price: number; store: string }) => void;
  onRemoveOffer: (comparisonId: string, offerId: string) => void;
  onAddToList: (comparisonId: string) => void;
}

interface OfferDraft {
  url: string;
  price: string;
}

function rowKey(comparisonId: string, idx: number): string {
  return `${comparisonId}-${idx}`;
}

export function PriceCompare({
  state,
  onAddComparison,
  onRemoveComparison,
  onAddOffer,
  onRemoveOffer,
  onAddToList,
}: PriceCompareProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, OfferDraft[]>>({});
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    const id = onAddComparison(productName.trim(), category);
    setDrafts((d) => ({ ...d, [id]: [{ url: '', price: '' }, { url: '', price: '' }] }));
    setExpandedId(id);
    setProductName('');
  };

  const getDrafts = (comparisonId: string): OfferDraft[] =>
    drafts[comparisonId] ?? [{ url: '', price: '' }];

  const setComparisonDrafts = (comparisonId: string, next: OfferDraft[]) => {
    setDrafts((d) => ({ ...d, [comparisonId]: next }));
  };

  const addDraftRow = (comparisonId: string) => {
    setComparisonDrafts(comparisonId, [...getDrafts(comparisonId), { url: '', price: '' }]);
  };

  const fetchPriceForRow = async (comparisonId: string, idx: number) => {
    const row = getDrafts(comparisonId)[idx];
    if (!row?.url.trim() || !isValidUrl(row.url)) {
      setFetchError('Вставьте корректную ссылку (https://...)');
      return;
    }

    const key = rowKey(comparisonId, idx);
    setFetchError(null);
    setLoadingRows((prev) => new Set(prev).add(key));

    try {
      const result = await fetchPriceFromUrl(row.url);
      const next = [...getDrafts(comparisonId)];
      next[idx] = {
        ...next[idx],
        price: String(result.price),
      };
      setComparisonDrafts(comparisonId, next);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки цены';
      setFetchError(
        `${msg} Откройте ссылку в новой вкладке, скопируйте цену (например «12 999 ₽») и вставьте в поле «Цена».`,
      );
    } finally {
      setLoadingRows((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  };

  const fetchAllPrices = async (comparisonId: string) => {
    const rows = getDrafts(comparisonId);
    const targets = rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row.url.trim() && isValidUrl(row.url) && !row.price.trim());

    if (targets.length === 0) {
      setFetchError('Нет ссылок без цены для загрузки');
      return;
    }

    setFetchError(null);
    for (const { idx } of targets) {
      await fetchPriceForRow(comparisonId, idx);
    }
  };

  const submitOffers = (comparison: PriceComparison) => {
    const rows = getDrafts(comparison.id).filter((r) => r.url.trim() && r.price);
    let added = 0;
    for (const row of rows) {
      if (!isValidUrl(row.url)) continue;
      const price = parsePriceInput(row.price) ?? Number(row.price.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(price) || price <= 0) continue;
      onAddOffer(comparison.id, {
        url: row.url.trim(),
        price,
        store: parseStoreFromUrl(row.url),
      });
      added++;
    }
    if (added > 0) {
      setComparisonDrafts(comparison.id, [{ url: '', price: '' }]);
      setFetchError(null);
    }
  };

  const pasteBulk = async (comparisonId: string, text: string) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: OfferDraft[] = lines.map((line) => {
      const match = line.match(/(https?:\/\/\S+)\s+([\d\s,.]+)/);
      if (match) {
        return { url: match[1], price: match[2].replace(/\s/g, '') };
      }
      return { url: line, price: '' };
    });
    const startLen = getDrafts(comparisonId).length;
    setComparisonDrafts(comparisonId, [...getDrafts(comparisonId), ...parsed]);

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      if (row.url && isValidUrl(row.url) && !row.price) {
        await fetchPriceForRow(comparisonId, startLen + i);
      }
    }
  };

  const { currency } = state.settings;

  return (
    <div className="compare">
      <section className="card">
        <h2>Сравнение цен по ссылкам</h2>
        <p className="card__desc">
          Для Ozon используется тот же способ, что в вашем PHP-парсере: cookies из браузера и API{' '}
          <code>entrypoint-api.bx</code>. Вставьте ссылку и нажмите ↓ (подождите 5–15 сек).
          Нужен <code>npm run dev</code> и <code>npx playwright install chromium</code>.
        </p>
        <form className="form-row" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Название товара, например «Стиральный порошок 3 кг»"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <button type="submit" className="btn btn--primary">Новое сравнение</button>
        </form>
      </section>

      {fetchError && (
        <p className="fetch-error" role="alert">{fetchError}</p>
      )}

      {state.comparisons.length === 0 && (
        <p className="empty-state">Пока нет сравнений. Создайте первое выше.</p>
      )}

      {state.comparisons.map((comparison) => {
        const stats = computePriceStats(comparison.offers);
        const isOpen = expandedId === comparison.id;

        return (
          <article key={comparison.id} className="card comparison-card">
            <header className="comparison-card__head">
              <div>
                <h3>{comparison.name}</h3>
                <span className="badge">{CATEGORY_LABELS[comparison.category]}</span>
              </div>
              <div className="comparison-card__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setExpandedId(isOpen ? null : comparison.id)}
                >
                  {isOpen ? 'Свернуть' : 'Добавить ссылки'}
                </button>
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => onRemoveComparison(comparison.id)}
                  aria-label="Удалить сравнение"
                >
                  ✕
                </button>
              </div>
            </header>

            {stats && (
              <div className="price-summary">
                <div className="price-summary__item price-summary__item--avg">
                  <span>Средняя</span>
                  <strong>{formatMoney(stats.average, currency)}</strong>
                </div>
                <div className="price-summary__item">
                  <span>Минимум</span>
                  <strong className="text-ok">{formatMoney(stats.min, currency)}</strong>
                </div>
                <div className="price-summary__item">
                  <span>Максимум</span>
                  <strong>{formatMoney(stats.max, currency)}</strong>
                </div>
                <div className="price-summary__item">
                  <span>Разброс</span>
                  <strong>{formatMoney(stats.spread, currency)}</strong>
                </div>
              </div>
            )}

            {comparison.offers.length > 0 && (
              <ul className="offers-list">
                {comparison.offers.map((offer) => {
                  const isBest = stats?.bestOfferId === offer.id;
                  return (
                    <li key={offer.id} className={isBest ? 'offer offer--best' : 'offer'}>
                      <div className="offer__main">
                        {isBest && <span className="offer__tag">Лучшая цена</span>}
                        <span className="offer__store">{offer.store}</span>
                        <strong className="offer__price">{formatMoney(offer.price, currency)}</strong>
                        <a href={offer.url} target="_blank" rel="noopener noreferrer" className="offer__link">
                          Открыть →
                        </a>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => onRemoveOffer(comparison.id, offer.id)}
                      >
                        Удалить
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {stats && stats.count >= 2 && (
              <div className="comparison-card__footer">
                <p className="recommendation">
                  Рекомендуем закладывать в бюджет около{' '}
                  <strong>{formatMoney(Math.round(stats.average), currency)}</strong>
                  {stats.spread > 0 && (
                    <> — экономия до {formatMoney(stats.spread, currency)} при выборе минимума</>
                  )}
                </p>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => onAddToList(comparison.id)}
                >
                  В список по средней цене
                </button>
              </div>
            )}

            {isOpen && (
              <div className="add-offers">
                <p className="add-offers__hint">
                  Вставьте ссылку и нажмите ↓ или уходите с поля — цена загрузится сама.
                  Поддерживаются Ozon, Wildberries, Яндекс Маркет и др.
                </p>
                <textarea
                  className="bulk-paste"
                  placeholder="Вставьте ссылки построчно — цены подгрузятся автоматически"
                  rows={3}
                  onBlur={async (e) => {
                    if (e.target.value.trim()) {
                      await pasteBulk(comparison.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                {getDrafts(comparison.id).map((row, idx) => {
                  const key = rowKey(comparison.id, idx);
                  const isLoading = loadingRows.has(key);

                  return (
                    <div key={idx} className={`form-row form-row--offer ${isLoading ? 'form-row--loading' : ''}`}>
                      <input
                        type="url"
                        placeholder="https://www.ozon.ru/product/..."
                        value={row.url}
                        disabled={isLoading}
                        onChange={(e) => {
                          const next = [...getDrafts(comparison.id)];
                          next[idx] = { ...next[idx], url: e.target.value };
                          setComparisonDrafts(comparison.id, next);
                        }}
                        onBlur={() => {
                          if (row.url.trim() && isValidUrl(row.url) && !row.price.trim()) {
                            void fetchPriceForRow(comparison.id, idx);
                          }
                        }}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={isLoading ? 'Загрузка 5–15 сек…' : 'Цена или вставьте «12 999 ₽»'}
                        value={row.price}
                        disabled={isLoading}
                        onChange={(e) => {
                          const next = [...getDrafts(comparison.id)];
                          next[idx] = { ...next[idx], price: e.target.value };
                          setComparisonDrafts(comparison.id, next);
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          const parsed = parsePriceInput(text);
                          if (parsed !== null) {
                            e.preventDefault();
                            const next = [...getDrafts(comparison.id)];
                            next[idx] = { ...next[idx], price: String(parsed) };
                            setComparisonDrafts(comparison.id, next);
                            setFetchError(null);
                          }
                        }}
                      />
                      {row.url.trim() && isValidUrl(row.url) && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--ghost btn--fetch"
                          title="Открыть товар"
                        >
                          ↗
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn--secondary btn--fetch"
                        disabled={isLoading || !row.url.trim()}
                        title="Загрузить цену со страницы"
                        onClick={() => void fetchPriceForRow(comparison.id, idx)}
                      >
                        {isLoading ? '…' : '↓'}
                      </button>
                    </div>
                  );
                })}
                <div className="form-actions">
                  <button type="button" className="btn btn--ghost" onClick={() => addDraftRow(comparison.id)}>
                    + Ещё ссылка
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => void fetchAllPrices(comparison.id)}
                  >
                    Загрузить все цены
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => submitOffers(comparison)}>
                    Добавить в сравнение
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
