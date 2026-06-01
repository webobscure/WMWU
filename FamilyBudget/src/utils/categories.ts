import type { Category } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Продукты',
  home: 'Дом и быт',
  kids: 'Дети',
  health: 'Здоровье',
  other: 'Другое',
};

export const CATEGORIES: Category[] = ['food', 'home', 'kids', 'health', 'other'];
