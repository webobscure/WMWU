export interface FetchedPrice {
  price: number;
  title?: string;
  store: string;
  source: string;
}

export async function fetchPriceFromUrl(url: string): Promise<FetchedPrice> {
  const response = await fetch(`/api/parse-price?url=${encodeURIComponent(url.trim())}`, {
    signal: AbortSignal.timeout(60_000),
  });

  const data = (await response.json()) as FetchedPrice & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Не удалось получить цену');
  }

  if (!data.price || data.price <= 0) {
    throw new Error('Цена не найдена');
  }

  return data;
}
