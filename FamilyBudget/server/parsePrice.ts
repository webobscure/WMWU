import { parsePriceWithBrowser, type ParsePriceResult } from './browserFetch';
import { assertSafeProductUrl, storeFromHostname } from './urlSafety';

export type { ParsePriceResult };

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  Referer: 'https://www.google.com/',
};

const BROWSER_FIRST_HOSTS = ['ozon.ru', 'ozon.com', 'wildberries.ru', 'wb.ru', 'market.yandex.ru'];

function needsBrowserFirst(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return BROWSER_FIRST_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function normalizeRubPrice(value: number, hostname: string): number {
  const host = hostname.toLowerCase();
  if (host.includes('wildberries') || host.includes('wb.ru')) {
    if (value > 100_000) return Math.round(value / 100);
  }
  return Math.round(value);
}

function pickBestPrice(candidates: number[], hostname: string): number | null {
  const valid = candidates
    .filter((n) => Number.isFinite(n) && n > 0 && n < 50_000_000)
    .map((n) => normalizeRubPrice(n, hostname));
  if (valid.length === 0) return null;
  return Math.min(...valid);
}

function extractJsonLdPrices(html: string): number[] {
  const prices: number[] = [];
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    try {
      collectJsonLdPrices(JSON.parse(match[1]) as unknown, prices);
    } catch {
      /* skip */
    }
  }
  return prices;
}

function collectJsonLdPrices(node: unknown, prices: number[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectJsonLdPrices(item, prices));
    return;
  }
  if (typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (obj['@type'] === 'Product' || obj['@type'] === 'Offer') {
    const offer = obj.offers;
    if (offer && typeof offer === 'object') {
      const o = offer as Record<string, unknown>;
      if (typeof o.price === 'number') prices.push(o.price);
      if (typeof o.lowPrice === 'number') prices.push(o.lowPrice);
    }
    if (typeof obj.price === 'number') prices.push(obj.price);
  }
  Object.values(obj).forEach((v) => collectJsonLdPrices(v, prices));
}

function extractMetaPrices(html: string): number[] {
  const prices: number[] = [];
  const patterns = [
    /property=["']product:price:amount["']\s+content=["']([\d.]+)["']/i,
    /property=["']og:price:amount["']\s+content=["']([\d.]+)["']/i,
    /itemprop=["']price["']\s+content=["']([\d.]+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) prices.push(Number(m[1]));
  }
  return prices;
}

function extractHostPatterns(html: string): number[] {
  const prices: number[] = [];
  const patterns = [
    /"finalPrice"\s*:\s*"?(\d+)"?/g,
    /"cardPrice"\s*:\s*"?(\d+)"?/g,
    /"salePriceU"\s*:\s*(\d+)/g,
    /"priceU"\s*:\s*(\d+)/g,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      prices.push(Number(m[1]));
    }
  }
  return prices;
}

function extractTitle(html: string): string | undefined {
  const og = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (og) return og[1].trim();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return title?.[1].trim();
}

function parseHtml(html: string, hostname: string): ParsePriceResult | null {
  const price = pickBestPrice(
    [...extractJsonLdPrices(html), ...extractMetaPrices(html), ...extractHostPatterns(html)],
    hostname,
  );
  if (price === null) return null;
  return {
    price,
    title: extractTitle(html),
    store: storeFromHostname(hostname),
    source: 'html',
  };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function wrapFetchError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new Error('Превышено время ожидания. Попробуйте ещё раз или введите цену вручную.');
    }
    const cause = error.cause as Error | undefined;
    const msg = error.message.toLowerCase();
    if (msg.includes('fetch failed') || cause?.message?.toLowerCase().includes('fetch failed')) {
      return new Error(
        'Магазин заблокировал запрос. Загружаем через браузер — подождите 5–15 секунд…',
      );
    }
    return error;
  }
  return new Error('Не удалось загрузить страницу');
}

export async function parsePriceFromUrl(productUrl: string): Promise<ParsePriceResult> {
  const parsed = assertSafeProductUrl(productUrl);
  const hostname = parsed.hostname;
  const url = parsed.toString();

  // Ozon / WB / Я.Маркет — сразу через Playwright (обычный fetch даёт 307)
  if (needsBrowserFirst(hostname)) {
    try {
      return await parsePriceWithBrowser(url);
    } catch (browserError) {
      const message =
        browserError instanceof Error ? browserError.message : 'Ошибка браузера';
      throw new Error(
        `${message} Если не помогло: один раз выполните «npx playwright install chromium» в папке проекта.`,
      );
    }
  }

  // Остальные магазины — сначала быстрый fetch
  try {
    const html = await fetchHtml(url);
    if (html.length >= 500) {
      const result = parseHtml(html, hostname);
      if (result) return result;
    }
  } catch (error) {
    const wrapped = wrapFetchError(error);
    if (!wrapped.message.includes('браузер')) {
      try {
        return await parsePriceWithBrowser(url);
      } catch {
        throw wrapped;
      }
    }
    throw wrapped;
  }

  try {
    return await parsePriceWithBrowser(url);
  } catch {
    throw new Error(
      'Цену не удалось получить. Откройте товар в браузере и введите цену вручную.',
    );
  }
}
