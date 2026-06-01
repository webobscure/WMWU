import type { ProductOffer } from '../types';

export interface PriceStats {
  count: number;
  min: number;
  max: number;
  average: number;
  spread: number;
  bestOfferId: string | null;
}

export function computePriceStats(offers: ProductOffer[]): PriceStats | null {
  if (offers.length === 0) return null;

  const prices = offers.map((o) => o.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const best = offers.find((o) => o.price === min);

  return {
    count: offers.length,
    min,
    max,
    average,
    spread: max - min,
    bestOfferId: best?.id ?? null,
  };
}
