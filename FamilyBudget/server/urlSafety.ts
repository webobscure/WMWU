const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function assertSafeProductUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('Некорректная ссылка');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Поддерживаются только http и https');
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local')) {
    throw new Error('Этот адрес недоступен');
  }

  if (/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(host)) {
    throw new Error('Локальные адреса запрещены');
  }

  return parsed;
}

export function storeFromHostname(hostname: string): string {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  const map: Record<string, string> = {
    'ozon.ru': 'Ozon',
    'ozon.com': 'Ozon',
    'wildberries.ru': 'Wildberries',
    'wb.ru': 'Wildberries',
    'market.yandex.ru': 'Яндекс Маркет',
    'yandex.ru': 'Яндекс Маркет',
    'megamarket.ru': 'Мегамаркет',
    'sbermegamarket.ru': 'Мегамаркет',
    'dns-shop.ru': 'DNS',
    'mvideo.ru': 'М.Видео',
    'citilink.ru': 'Ситилинк',
    'lamoda.ru': 'Lamoda',
  };

  for (const [domain, name] of Object.entries(map)) {
    if (host === domain || host.endsWith(`.${domain}`)) return name;
  }

  const parts = host.split('.');
  if (parts.length >= 2) {
    const base = parts[parts.length - 2];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return host;
}
