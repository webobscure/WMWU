import type { AppSettings } from '../types';

const SYMBOLS: Record<AppSettings['currency'], string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

export function formatMoney(amount: number, currency: AppSettings['currency']): string {
  const symbol = SYMBOLS[currency];
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}
