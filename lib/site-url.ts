const FALLBACK_SITE_URL = 'https://web.icoffio.com';

function normalizeSiteUrl(raw: string): string | null {
  const candidate = (raw || '').trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!/^https?:$/i.test(url.protocol)) return null;

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function getSiteBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    FALLBACK_SITE_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSiteUrl(candidate || '');
    if (normalized) {
      return normalized;
    }
  }

  return FALLBACK_SITE_URL;
}

export function buildSiteUrl(path: string): string {
  const base = getSiteBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, `${base}/`).toString();
}
