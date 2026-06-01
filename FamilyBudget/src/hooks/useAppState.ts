import { useCallback, useEffect, useState } from 'react';
import type {
  AppSettings,
  AppState,
  PriceComparison,
  ProductOffer,
  ShoppingItem,
} from '../types';
import { createId, defaultState, loadState, saveState } from '../utils/storage';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const addComparison = useCallback((name: string, category: PriceComparison['category']) => {
    const comparison: PriceComparison = {
      id: createId(),
      name,
      category,
      offers: [],
      createdAt: new Date().toISOString(),
      targetQuantity: 1,
    };
    setState((s) => ({ ...s, comparisons: [comparison, ...s.comparisons] }));
    return comparison.id;
  }, []);

  const removeComparison = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      comparisons: s.comparisons.filter((c) => c.id !== id),
    }));
  }, []);

  const addOffer = useCallback((comparisonId: string, offer: Omit<ProductOffer, 'id'>) => {
    const newOffer: ProductOffer = { ...offer, id: createId() };
    setState((s) => ({
      ...s,
      comparisons: s.comparisons.map((c) =>
        c.id === comparisonId ? { ...c, offers: [...c.offers, newOffer] } : c,
      ),
    }));
    return newOffer.id;
  }, []);

  const removeOffer = useCallback((comparisonId: string, offerId: string) => {
    setState((s) => ({
      ...s,
      comparisons: s.comparisons.map((c) =>
        c.id === comparisonId
          ? { ...c, offers: c.offers.filter((o) => o.id !== offerId) }
          : c,
      ),
    }));
  }, []);

  const addShoppingItem = useCallback((item: Omit<ShoppingItem, 'id' | 'purchased'>) => {
    const newItem: ShoppingItem = { ...item, id: createId(), purchased: false };
    setState((s) => ({ ...s, shoppingList: [newItem, ...s.shoppingList] }));
  }, []);

  const updateShoppingItem = useCallback((id: string, patch: Partial<ShoppingItem>) => {
    setState((s) => ({
      ...s,
      shoppingList: s.shoppingList.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      shoppingList: s.shoppingList.filter((item) => item.id !== id),
    }));
  }, []);

  const addToListFromComparison = useCallback((comparisonId: string) => {
    const comparison = state.comparisons.find((c) => c.id === comparisonId);
    if (!comparison || comparison.offers.length === 0) return;

    const prices = comparison.offers.map((o) => o.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    addShoppingItem({
      name: comparison.name,
      category: comparison.category,
      quantity: comparison.targetQuantity,
      plannedPrice: Math.round(avg),
      plannedDate: new Date().toISOString().slice(0, 10),
      comparisonId,
    });
  }, [state.comparisons, addShoppingItem]);

  const resetAll = useCallback(() => {
    if (window.confirm('Удалить все данные? Это нельзя отменить.')) {
      setState(defaultState);
    }
  }, []);

  return {
    state,
    updateSettings,
    addComparison,
    removeComparison,
    addOffer,
    removeOffer,
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    addToListFromComparison,
    resetAll,
  };
}
