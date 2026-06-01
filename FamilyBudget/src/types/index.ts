export type Category = 'food' | 'home' | 'kids' | 'health' | 'other';

export type ViewId = 'dashboard' | 'compare' | 'list' | 'calendar';

export interface ProductOffer {
  id: string;
  url: string;
  price: number;
  store: string;
  note?: string;
}

export interface PriceComparison {
  id: string;
  name: string;
  category: Category;
  offers: ProductOffer[];
  createdAt: string;
  targetQuantity: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  plannedPrice: number;
  plannedDate: string;
  purchased: boolean;
  comparisonId?: string;
  note?: string;
}

export interface AppSettings {
  monthlyBudget: number;
  currency: 'RUB' | 'USD' | 'EUR';
}

export interface AppState {
  version: 2;
  settings: AppSettings;
  comparisons: PriceComparison[];
  shoppingList: ShoppingItem[];
}
