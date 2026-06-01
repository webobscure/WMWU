export function parseStoreFromUrl(url: string): string {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
    return host;
  } catch {
    return 'Магазин';
  }
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
