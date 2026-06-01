import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Page } from 'playwright';

const OZON_HOST = 'https://www.ozon.ru';
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(SERVER_DIR, '..', 'storage', 'browser-profiles', 'ozon.ru');

let contextPromise: Promise<BrowserContext> | null = null;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function shouldRunHeadless(): boolean {
  const env = process.env.SELENIUM_HEADLESS;
  if (env !== undefined) {
    return ['1', 'true', 'yes', 'on'].includes(env.toLowerCase());
  }
  return process.platform === 'linux' && !process.env.DISPLAY;
}

function warmupUrls(): string[] {
  const raw = process.env.SELENIUM_WARMUP_URLS ?? OZON_HOST;
  return raw.split(',').map((u) => u.trim()).filter(Boolean);
}

export async function getOzonContext(): Promise<BrowserContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      const { chromium } = await import('playwright');
      const args = [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--remote-allow-origins=*',
      ];

      const launchOptions = {
        headless: shouldRunHeadless(),
        locale: 'ru-RU' as const,
        viewport: { width: 1200, height: 1100 },
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        args,
        extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
      };

      try {
        return await chromium.launchPersistentContext(PROFILE_DIR, {
          ...launchOptions,
          channel: 'chrome',
        });
      } catch {
        return chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
      }
    })();
  }
  return contextPromise;
}

export async function waitForStableCookies(page: Page): Promise<void> {
  const waitSeconds = envInt('SELENIUM_COOKIE_WAIT', 25);
  const minWaitSeconds = envInt('SELENIUM_COOKIE_MIN_WAIT', 8);

  let lastSignature = '';
  let stableTicks = 0;

  for (let tick = 0; tick < Math.max(waitSeconds, 1); tick++) {
    await page.waitForTimeout(1000);
    const cookies = await page.context().cookies();
    const signature = JSON.stringify(
      cookies
        .map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path }))
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    );

    if (signature && signature === lastSignature) {
      stableTicks++;
    } else {
      stableTicks = 0;
      lastSignature = signature;
    }

    if (tick + 1 >= minWaitSeconds && stableTicks >= 2) {
      break;
    }
  }
}

export async function openWarmups(page: Page): Promise<void> {
  for (const url of warmupUrls()) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
    await waitForStableCookies(page);
  }
}

export async function prepareOzonSession(page: Page, refererUrl: string): Promise<void> {
  await openWarmups(page);
  await page.goto(refererUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
  await waitForStableCookies(page);
}

export function buildEntrypointApiUrl(urlPage: string): string {
  const params = new URLSearchParams({ url: urlPage });
  return `${OZON_HOST}/api/entrypoint-api.bx/page/json/v2?${params.toString()}`;
}
