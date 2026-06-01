import { parseOzonProduct } from './ozonApi';
import { storeFromHostname } from './urlSafety';
import { parseWildberriesWithPage } from './wildberriesApi';

export interface ParsePriceResult {
  price: number;
  title?: string;
  store: string;
  source: string;
}

let browserPromise: Promise<import('playwright').Browser> | null = null;

async function getBrowser(): Promise<import('playwright').Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('playwright');
      const launchOptions = {
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      };
      try {
        return await chromium.launch({ ...launchOptions, channel: 'chrome' });
      } catch {
        return chromium.launch(launchOptions);
      }
    })();
  }
  return browserPromise;
}

function parsePriceFromText(text: string): number | null {
  const normalized = text.replace(/\u00a0/g, ' ').trim();
  const match = normalized.match(/(\d[\d\s]*)\s*(?:₽|руб|RUB)/i);
  if (!match) return null;
  const value = Number(match[1].replace(/\s/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function parsePriceWithBrowser(productUrl: string): Promise<ParsePriceResult> {
  const parsed = new URL(productUrl);
  const hostname = parsed.hostname.toLowerCase();

  if (hostname.includes('ozon')) {
    return parseOzonProduct(productUrl);
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: 'ru-RU',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1365, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  try {
    if (hostname.includes('wildberries') || hostname.includes('wb.ru')) {
      return await parseWildberriesWithPage(page, productUrl);
    }

    await page.goto(productUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 35_000,
    });

    // Дождаться появления цены (Ozon/WB грузят её скриптами)
    await page
      .waitForFunction(
        () => {
          const meta = document.querySelector('meta[property="product:price:amount"]');
          if (meta?.getAttribute('content')) return true;
          const text = document.body?.innerText ?? '';
          return /₽|руб/i.test(text) && /\d/.test(text);
        },
        { timeout: 12_000 },
      )
      .catch(() => undefined);

    const extracted = await page.evaluate(() => {
      const result: { prices: number[]; title?: string } = { prices: [] };

      const meta = document.querySelector('meta[property="product:price:amount"]');
      if (meta?.getAttribute('content')) {
        result.prices.push(Number(meta.getAttribute('content')));
      }

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle?.getAttribute('content')) {
        result.title = ogTitle.getAttribute('content') ?? undefined;
      }

      const selectors = [
        '[data-widget="webPrice"]',
        '[data-widget="webSale"]',
        '[data-auto="price"]',
        '.price-block__price',
        'ins[class*="price"]',
        'span[class*="price"]',
      ];

      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          const text = (el as HTMLElement).innerText || '';
          const m = text.replace(/\u00a0/g, ' ').match(/(\d[\d\s]*)/);
          if (m) {
            const n = Number(m[1].replace(/\s/g, ''));
            if (n > 0) result.prices.push(n);
          }
        });
      }

      // JSON в script (Ozon)
      document.querySelectorAll('script').forEach((script) => {
        const content = script.textContent ?? '';
        if (!content.includes('price') && !content.includes('Price')) return;
        for (const m of content.matchAll(/"finalPrice"\s*:\s*"?(\d+)"?/g)) {
          result.prices.push(Number(m[1]));
        }
        for (const m of content.matchAll(/"price"\s*:\s*"?(\d+)"?/g)) {
          result.prices.push(Number(m[1]));
        }
      });

      if (!result.title && document.title) {
        result.title = document.title.replace(/\s*\|\s*OZON.*$/i, '').trim();
      }

      return result;
    });

    const validPrices = extracted.prices.filter((p) => Number.isFinite(p) && p > 0 && p < 50_000_000);
    let price = validPrices.length > 0 ? Math.min(...validPrices) : null;

    if (price === null) {
      const bodyText = await page.locator('body').innerText();
      price = parsePriceFromText(bodyText);
    }

    if (price === null) {
      throw new Error(
        'Цена на странице не найдена. Возможно, нужна капча — откройте ссылку в браузере и введите цену вручную.',
      );
    }

    return {
      price: Math.round(price),
      title: extracted.title,
      store: storeFromHostname(hostname),
      source: 'browser',
    };
  } finally {
    await context.close();
  }
}
