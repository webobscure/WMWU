import type { ParsePriceResult } from './browserFetch';
import { fetchInBrowser } from './browserFetchScript';
import {
  buildEntrypointApiUrl,
  getOzonContext,
  prepareOzonSession,
} from './ozonContext';
import { fetchViaSeleniumScript } from './seleniumFetch';

const OZON_HOST = 'https://www.ozon.ru';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractOzonProductPath(url: string): string {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/product\/[^/]+\/?/);
  if (match) return match[0].endsWith('/') ? match[0] : `${match[0]}/`;
  throw new Error('Не удалось разобрать ссылку Ozon');
}

function strPriceToInt(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseWidgetStates(data: Record<string, unknown>): { price: number; title?: string } | null {
  const widgetStates = data.widgetStates;
  if (!widgetStates || typeof widgetStates !== 'object') return null;

  const prices: number[] = [];
  let title: string | undefined;

  for (const widgetJson of Object.values(widgetStates as Record<string, string>)) {
    if (typeof widgetJson !== 'string') continue;

    let widget: Record<string, unknown>;
    try {
      widget = JSON.parse(widgetJson) as Record<string, unknown>;
    } catch {
      continue;
    }

    const tracking = widget.cellTrackingInfo as Record<string, unknown> | undefined;
    const product = tracking?.product as Record<string, unknown> | undefined;
    if (product) {
      if (typeof product.title === 'string') title = product.title;
      if (typeof product.finalPrice === 'number') prices.push(product.finalPrice);
      if (typeof product.price === 'number') prices.push(product.price);
    }

    const mainState = widget.mainState;
    if (Array.isArray(mainState)) {
      for (const state of mainState) {
        if (!state || typeof state !== 'object') continue;
        const s = state as Record<string, unknown>;

        if (s.type === 'textAtom') {
          const textAtom = s.textAtom as Record<string, unknown> | undefined;
          if (typeof textAtom?.text === 'string' && !title) title = textAtom.text;
        }

        if (s.type === 'priceV2') {
          const priceV2 = s.priceV2 as Record<string, unknown> | undefined;
          const priceBlocks = priceV2?.price;
          if (Array.isArray(priceBlocks)) {
            let walletPrice: number | null = null;
            let regularPrice: number | null = null;
            let originalPrice: number | null = null;

            for (const block of priceBlocks) {
              if (!block || typeof block !== 'object') continue;
              const b = block as Record<string, unknown>;
              const text = typeof b.text === 'string' ? b.text : '';
              const style = b.textStyle;
              const n = strPriceToInt(text);
              if (!n) continue;

              if (style === 'PRICE') walletPrice = n;
              else if (style === 'ORIGINAL_PRICE') originalPrice = n;
              else regularPrice = n;
            }

            if (originalPrice && walletPrice) {
              prices.push(walletPrice, originalPrice);
            } else if (walletPrice) {
              prices.push(walletPrice);
            } else if (regularPrice) {
              prices.push(regularPrice);
            }
          }
        }
      }
    }

    const items = widget.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const states = (item as Record<string, unknown>).mainState;
        if (!Array.isArray(states)) continue;

        for (const state of states) {
          if (!state || typeof state !== 'object') continue;
          const s = state as Record<string, unknown>;
          if (s.type !== 'priceV2') continue;
          const priceV2 = s.priceV2 as Record<string, unknown> | undefined;
          const priceBlocks = priceV2?.price;
          if (!Array.isArray(priceBlocks)) continue;
          for (const block of priceBlocks) {
            const b = block as Record<string, unknown>;
            if (typeof b.text === 'string') {
              const n = strPriceToInt(b.text);
              if (n) prices.push(n);
            }
          }
        }
      }
    }
  }

  const valid = prices.filter((p) => p > 0 && p < 50_000_000);
  if (valid.length === 0) return null;
  return { price: Math.min(...valid), title };
}

function parseJsonBody(body: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    return data.widgetStates ? data : null;
  } catch {
    return null;
  }
}

async function fetchViaPlaywrightRequest(
  context: import('playwright').BrowserContext,
  urlPage: string,
  referer: string,
): Promise<Record<string, unknown> | null> {
  for (const endpoint of [
    '/api/entrypoint-api.bx/page/json/v2',
    '/api/composer-api.bx/page/json/v2',
  ]) {
    try {
      const response = await context.request.get(`${OZON_HOST}${endpoint}`, {
        params: { url: urlPage },
        headers: {
          Accept: 'application/json, text/plain, */*',
          Origin: OZON_HOST,
          Referer: referer,
          'User-Agent': USER_AGENT,
        },
        timeout: 30_000,
      });
      if (!response.ok()) continue;
      const data = (await response.json()) as Record<string, unknown>;
      if (data.widgetStates) return data;
    } catch {
      /* next */
    }
  }
  return null;
}

async function parseFromDom(page: import('playwright').Page): Promise<{ price: number; title?: string } | null> {
  return page.evaluate(() => {
    const prices: number[] = [];
    let title: string | undefined;

    const meta = document.querySelector('meta[property="product:price:amount"]');
    if (meta?.getAttribute('content')) prices.push(Number(meta.getAttribute('content')));

    document.querySelectorAll('[data-widget="webPrice"], [data-auto="price"]').forEach((el) => {
      const t = (el as HTMLElement).innerText.replace(/\u00a0/g, ' ');
      const m = t.match(/(\d[\d\s]*)/);
      if (m) prices.push(Number(m[1].replace(/\s/g, '')));
    });

    const og = document.querySelector('meta[property="og:title"]');
    if (og?.getAttribute('content')) title = og.getAttribute('content') ?? undefined;

    const valid = prices.filter((p) => p > 0);
    return valid.length ? { price: Math.min(...valid), title } : null;
  });
}

/** Главная точка входа для Ozon (persistent profile + Selenium fallback) */
export async function parseOzonProduct(productUrl: string): Promise<ParsePriceResult> {
  const productPath = extractOzonProductPath(productUrl);
  const referer = productUrl.startsWith('http') ? productUrl : `${OZON_HOST}${productPath}`;
  const apiUrl = buildEntrypointApiUrl(productPath);

  const context = await getOzonContext();
  const page = await context.newPage();

  try {
    await prepareOzonSession(page, referer);

    // 1) Ваш Selenium fetch-url.sh (если настроен FAMILY_BUDGET_FETCH_SCRIPT)
    const seleniumJson = await fetchViaSeleniumScript(referer, apiUrl);
    if (seleniumJson) {
      const data = parseJsonBody(seleniumJson);
      if (data) {
        const parsed = parseWidgetStates(data);
        if (parsed) {
          return { ...parsed, store: 'Ozon', source: 'ozon-selenium' };
        }
      }
    }

    // 2) fetch() внутри браузера — как fetch_with_browser в Python
    const browserResult = await fetchInBrowser(page, apiUrl, 'GET', null);
    if (browserResult.status === 200 && browserResult.body) {
      const data = parseJsonBody(browserResult.body);
      if (data) {
        const parsed = parseWidgetStates(data);
        if (parsed) {
          return { ...parsed, store: 'Ozon', source: 'ozon-browser-fetch' };
        }
      }
    }

    // 3) HTTP с cookies контекста (как Guzzle + CookieJar)
    let data = await fetchViaPlaywrightRequest(context, productPath, referer);
    if (data) {
      const parsed = parseWidgetStates(data);
      if (parsed) {
        return { ...parsed, store: 'Ozon', source: 'ozon-entrypoint' };
      }
    }

    // 4) DOM
    if (!page.url().includes('/product/')) {
      await page.goto(referer, { waitUntil: 'domcontentloaded', timeout: 35_000 });
      await sleep(2000);
    }

    const fromDom = await parseFromDom(page);
    if (!fromDom) {
      throw new Error(
        'Ozon не отдал цену. Укажите FAMILY_BUDGET_FETCH_SCRIPT на ваш fetch-url.sh или вставьте цену вручную (↗).',
      );
    }

    return { ...fromDom, store: 'Ozon', source: 'ozon-dom' };
  } finally {
    await page.close();
  }
}

/** @deprecated используйте parseOzonProduct */
export async function parseOzonWithPage(
  page: import('playwright').Page,
  productUrl: string,
): Promise<ParsePriceResult> {
  void page;
  return parseOzonProduct(productUrl);
}
