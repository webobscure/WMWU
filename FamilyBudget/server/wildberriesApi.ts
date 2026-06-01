import type { ParsePriceResult } from './browserFetch';

function extractWbArticle(url: string): string {
  const parsed = new URL(url);
  const catalog = parsed.pathname.match(/\/catalog\/(\d+)/);
  if (catalog) return catalog[1];

  const nm = parsed.searchParams.get('nm');
  if (nm) return nm;

  throw new Error('Не удалось найти артикул в ссылке Wildberries');
}

export async function parseWildberriesWithPage(
  page: import('playwright').Page,
  productUrl: string,
): Promise<ParsePriceResult> {
  const article = extractWbArticle(productUrl);

  await page.goto('https://www.wildberries.ru/', { waitUntil: 'domcontentloaded', timeout: 25_000 });
  await page.waitForTimeout(1000);

  const apiResult = await page.evaluate(async (nm) => {
    const bases = [
      'https://card.wb.ru/cards/v2/detail',
      'https://card.wb.ru/cards/v1/detail',
    ];
    const params = new URLSearchParams({
      appType: '1',
      curr: 'rub',
      dest: '-1257786',
      spp: '30',
      nm,
    });

    for (const base of bases) {
      try {
        const res = await fetch(`${base}?${params}`, { credentials: 'include' });
        if (!res.ok) continue;
        const data = await res.json();
        const products = data?.data?.products;
        if (!Array.isArray(products) || products.length === 0) continue;

        const p = products[0];
        const sale = p.salePriceU ?? p.priceU ?? p.salePrice;
        if (typeof sale === 'number' && sale > 0) {
          const price = sale > 100_000 ? Math.round(sale / 100) : sale;
          return {
            ok: true as const,
            price,
            title: typeof p.name === 'string' ? p.name : undefined,
          };
        }
      } catch {
        /* try next */
      }
    }
    return { ok: false as const };
  }, article);

  if (apiResult.ok) {
    return {
      price: apiResult.price,
      title: apiResult.title,
      store: 'Wildberries',
      source: 'wb-api',
    };
  }

  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 35_000 });
  await page.waitForTimeout(2000);

  const fromDom = await page.evaluate(() => {
    const prices: number[] = [];
    document.querySelectorAll('ins, span').forEach((el) => {
      const t = (el as HTMLElement).innerText;
      if (!/₽|руб/i.test(t)) return;
      const m = t.replace(/\u00a0/g, ' ').match(/(\d[\d\s]*)/);
      if (m) prices.push(Number(m[1].replace(/\s/g, '')));
    });
    const valid = prices.filter((p) => p > 0);
    return valid.length ? Math.min(...valid) : null;
  });

  if (!fromDom) {
    throw new Error('Wildberries не отдал цену. Скопируйте цену со страницы вручную.');
  }

  return {
    price: fromDom,
    store: 'Wildberries',
    source: 'wb-dom',
  };
}
