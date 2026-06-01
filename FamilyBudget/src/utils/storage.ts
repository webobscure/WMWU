import type { AppState, Category, PriceComparison, ShoppingItem } from '../types';
import { CATEGORIES } from './categories';

const STORAGE_KEY = 'family-budget-v2';
const LEGACY_KEY = 'family-planner-tasks';

interface LegacyTask {
  id: number;
  name: string;
  quantity: number;
  dueDate: string;
}

export const defaultState: AppState = {
  version: 2,
  settings: { monthlyBudget: 50000, currency: 'RUB' },
  comparisons: [],
  shoppingList: [],
};

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORIES.includes(value as Category);
}

export function normalizeAppState(raw: unknown): AppState {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const settingsRaw =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : {};

  const currency =
    settingsRaw.currency === 'USD' || settingsRaw.currency === 'EUR'
      ? settingsRaw.currency
      : 'RUB';

  const monthlyBudget =
    typeof settingsRaw.monthlyBudget === 'number' && settingsRaw.monthlyBudget >= 0
      ? settingsRaw.monthlyBudget
      : defaultState.settings.monthlyBudget;

  const comparisons: PriceComparison[] = Array.isArray(data.comparisons)
    ? data.comparisons.map((item, index) => {
        const c = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const offers = Array.isArray(c.offers)
          ? c.offers
              .filter((o) => o && typeof o === 'object')
              .map((o) => {
                const offer = o as Record<string, unknown>;
                return {
                  id: typeof offer.id === 'string' ? offer.id : createId(),
                  url: typeof offer.url === 'string' ? offer.url : '',
                  price: typeof offer.price === 'number' ? offer.price : 0,
                  store: typeof offer.store === 'string' ? offer.store : 'Магазин',
                  note: typeof offer.note === 'string' ? offer.note : undefined,
                };
              })
          : [];

        return {
          id: typeof c.id === 'string' ? c.id : createId(),
          name: typeof c.name === 'string' ? c.name : `Товар ${index + 1}`,
          category: isCategory(c.category) ? c.category : 'other',
          offers,
          createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
          targetQuantity:
            typeof c.targetQuantity === 'number' && c.targetQuantity > 0 ? c.targetQuantity : 1,
        };
      })
    : [];

  const shoppingList: ShoppingItem[] = Array.isArray(data.shoppingList)
    ? data.shoppingList
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
          const s = item as Record<string, unknown>;
          return {
            id: typeof s.id === 'string' ? s.id : createId(),
            name: typeof s.name === 'string' ? s.name : 'Покупка',
            category: isCategory(s.category) ? s.category : 'other',
            quantity: typeof s.quantity === 'number' && s.quantity > 0 ? s.quantity : 1,
            plannedPrice: typeof s.plannedPrice === 'number' ? s.plannedPrice : 0,
            plannedDate:
              typeof s.plannedDate === 'string'
                ? s.plannedDate
                : new Date().toISOString().slice(0, 10),
            purchased: Boolean(s.purchased),
            comparisonId: typeof s.comparisonId === 'string' ? s.comparisonId : undefined,
            note: typeof s.note === 'string' ? s.note : undefined,
          };
        })
    : [];

  return {
    version: 2,
    settings: { monthlyBudget, currency },
    comparisons,
    shoppingList,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeAppState(JSON.parse(raw));
    }
  } catch {
    /* ignore */
  }

  return migrateLegacyTasks();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAppState(state)));
  } catch {
    /* private mode / quota */
  }
}

function migrateLegacyTasks(): AppState {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return defaultState;

    const tasks = JSON.parse(legacy) as LegacyTask[];
    if (!Array.isArray(tasks)) return defaultState;

    const shoppingList: ShoppingItem[] = tasks.map((t) => ({
      id: String(t.id),
      name: t.name,
      category: 'other' as const,
      quantity: t.quantity,
      plannedPrice: 0,
      plannedDate: t.dueDate,
      purchased: false,
    }));

    return { ...defaultState, shoppingList };
  } catch {
    return defaultState;
  }
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
