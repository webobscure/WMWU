import type { Page } from 'playwright';

export interface BrowserFetchResult {
  status: number;
  body: string;
  error?: string;
}

/** Тот же fetch, что в Python fetch-url.py (execute_async_script) */
export async function fetchInBrowser(
  page: Page,
  fetchUrl: string,
  method = 'GET',
  body: string | null = null,
): Promise<BrowserFetchResult> {
  const timeoutMs = parseInt(process.env.SELENIUM_FETCH_TIMEOUT_MS ?? '45000', 10);

  return page.evaluate(
    async ({ fetchUrl: url, method: httpMethod, body: reqBody, timeoutMs: timeout }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const headers: Record<string, string> = {
        accept: '*/*',
        'x-requested-with': 'XMLHttpRequest',
        'x-userid': '0',
      };
      const params: RequestInit = {
        method: httpMethod,
        credentials: 'include',
        headers,
        signal: controller.signal,
      };

      if (reqBody !== null && reqBody !== '') {
        headers['content-type'] = 'application/x-www-form-urlencoded';
        params.body = reqBody;
      }

      try {
        const response = await fetch(url, params);
        clearTimeout(timer);
        return {
          status: response.status,
          body: await response.text(),
        };
      } catch (error) {
        clearTimeout(timer);
        return {
          status: 0,
          body: '',
          error: String(error),
        };
      }
    },
    { fetchUrl, method, body, timeoutMs },
  );
}
