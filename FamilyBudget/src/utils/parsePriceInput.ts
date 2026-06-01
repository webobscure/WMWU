/** Извлекает число из «12 999 ₽», «12999» и т.п. */
export function parsePriceInput(raw: string): number | null {
  const cleaned = raw.replace(/\u00a0/g, ' ').trim();
  const match = cleaned.match(/(\d[\d\s]*(?:[.,]\d+)?)/);
  if (!match) return null;
  const num = Number(match[1].replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}
