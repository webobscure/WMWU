import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function resolveFetchScript(): string | null {
  const candidates = [
    process.env.FAMILY_BUDGET_FETCH_SCRIPT,
    process.env.LEGACY_FETCH_URL_SH,
    path.join(process.cwd(), 'scripts', 'fetch-url.sh'),
  ].filter((p): p is string => Boolean(p));

  for (const script of candidates) {
    if (existsSync(script)) return script;
  }
  return null;
}

/**
 * Вызов вашего fetch-url.sh (Selenium), как в PHP OzonParser::getJsonFromBrowser.
 * referer — страница товара, fetchUrl — полный URL API entrypoint.
 */
export async function fetchViaSeleniumScript(
  referer: string,
  fetchUrl: string,
): Promise<string | null> {
  const script = resolveFetchScript();
  if (!script) return null;

  try {
    const { stdout } = await execFileAsync('bash', [script, referer, fetchUrl, 'GET'], {
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024,
      cwd: process.cwd(),
      env: {
        ...process.env,
        SELENIUM_HEADLESS: process.env.SELENIUM_HEADLESS ?? '1',
        SELENIUM_WARMUP_URLS: process.env.SELENIUM_WARMUP_URLS ?? 'https://www.ozon.ru/',
      },
    });

    const trimmed = stdout.trim();
    if (!trimmed) return null;

    // JSON может идти после служебных строк — берём первую строку с {
    const jsonLine =
      trimmed
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('{') || l.startsWith('[')) ?? trimmed;

    return jsonLine;
  } catch (error) {
    console.error('[seleniumFetch]', error);
    return null;
  }
}
