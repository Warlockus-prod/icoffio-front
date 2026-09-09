/**
 * Which ad stack runs for a given request.
 *
 * - `vox`    — VOX SSP only. The default for icoffio.com and app.icoffio.com.
 * - `prebid` — Bidio/Prebid only. web.icoffio.com test subdomain.
 * - `both`   — run both side by side (comparison only, not used in production).
 *
 * IMPORTANT: one container serves icoffio.com, app.icoffio.com AND
 * web.icoffio.com. A build-time env var therefore CANNOT separate them —
 * setting NEXT_PUBLIC_ADS_PROVIDER=prebid switched VOX off on the main sites
 * and stopped their ads. The provider must be resolved per request host.
 *
 * No 'use client' here on purpose: the root layout resolves the provider from
 * the Host header on the server, and the client hook reuses the same logic.
 */
export type AdsProvider = 'vox' | 'prebid' | 'both';

/** Hosts that run the Bidio/Prebid stack instead of VOX. */
export const PREBID_HOSTS = ['web.icoffio.com'] as const;

export const ADS_PROVIDER_FALLBACK: AdsProvider = 'vox';

export function normalizeAdsProvider(value: string | null | undefined): AdsProvider | null {
  if (value === 'vox' || value === 'prebid' || value === 'both') return value;
  return null;
}

function bareHost(host: string | null | undefined): string {
  return (host || '').toLowerCase().split(':')[0].trim();
}

/** Local dev, where the ?ads= override is always allowed. */
export function isLocalHost(host: string | null | undefined): boolean {
  const name = bareHost(host);
  return name === 'localhost' || name === '127.0.0.1' || name === '::1';
}

/**
 * The ?ads= query override is a debugging tool. It is honoured only on local
 * dev and on hosts that already run Prebid — never on icoffio.com, where a
 * stray `?ads=prebid` link would silently disable VOX for that visitor.
 */
export function allowsAdsOverride(host: string | null | undefined): boolean {
  return isLocalHost(host) || (PREBID_HOSTS as readonly string[]).includes(bareHost(host));
}

/**
 * Resolution order: known prebid host → NEXT_PUBLIC_ADS_PROVIDER → vox.
 * The env var stays useful for a future standalone deployment, but it can no
 * longer flip the shared container's main domains by accident.
 */
export function resolveAdsProviderForHost(host: string | null | undefined): AdsProvider {
  if ((PREBID_HOSTS as readonly string[]).includes(bareHost(host))) return 'prebid';
  return normalizeAdsProvider(process.env.NEXT_PUBLIC_ADS_PROVIDER) ?? ADS_PROVIDER_FALLBACK;
}

export function isVoxEnabled(provider: AdsProvider): boolean {
  return provider === 'vox' || provider === 'both';
}

export function isPrebidEnabled(provider: AdsProvider): boolean {
  return provider === 'prebid' || provider === 'both';
}
