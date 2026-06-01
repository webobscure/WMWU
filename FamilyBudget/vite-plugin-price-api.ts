import type { Connect, Plugin } from 'vite';
import { parsePriceFromUrl } from './server/parsePrice';

function createPriceApiMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/parse-price') {
      next();
      return;
    }

    try {
      const url = new URL(req.url ?? '', 'http://localhost');
      const productUrl = url.searchParams.get('url');

      if (!productUrl) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Параметр url обязателен' }));
        return;
      }

      const result = await parsePriceFromUrl(productUrl);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка парсинга';
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: message }));
    }
  };
}

export function priceApiPlugin(): Plugin {
  const attach = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(createPriceApiMiddleware());
  };

  return {
    name: 'family-budget-price-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
