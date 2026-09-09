'use client';

import { useEffect, useState } from 'react';

/**
 * Which ad stack runs on this deployment.
 *
 * - `vox`    — VOX SSP only (main icoffio, default; unchanged behaviour)
 * - `prebid` — Bidio/Prebid only (web.icoffio.com test subdomain)
 * - `both`   — run both side by side to compare fill
 *
 * Set per deployment via NEXT_PUBLIC_ADS_PROVIDER. NEXT_PUBLIC_* vars are baked
 * at build time, so the subdomain build carries its own value.
 *
 * For live debugging, `?ads=prebid` overrides it for the current tab and is kept
 * in sessionStorage so it survives client-side navigation.
 */
export type AdsProvider = 'vox' | 'prebid' | 'both';

const OVERRIDE_KEY = 'icoffio_ads_provider_override';

function normalize(value: string | null | undefined): AdsProvider | null {
  if (value === 'vox' || value === 'prebid' || value === 'both') return value;
  return null;
}

/** Build-time default. Falls back to `vox` so existing deployments are untouched. */
export function getDefaultAdsProvider(): AdsProvider {
  return normalize(process.env.NEXT_PUBLIC_ADS_PROVIDER) ?? 'vox';
}

export function useAdsProvider(): AdsProvider {
  // First render must match the server output, so start from the build-time value.
  const [provider, setProvider] = useState<AdsProvider>(getDefaultAdsProvider);

  useEffect(() => {
    try {
      const fromQuery = normalize(new URLSearchParams(window.location.search).get('ads'));
      if (fromQuery) {
        window.sessionStorage.setItem(OVERRIDE_KEY, fromQuery);
        setProvider(fromQuery);
        return;
      }
      const stored = normalize(window.sessionStorage.getItem(OVERRIDE_KEY));
      if (stored) setProvider(stored);
    } catch {
      // sessionStorage unavailable (private mode) — keep the build-time value.
    }
  }, []);

  return provider;
}

export function isVoxEnabled(provider: AdsProvider): boolean {
  return provider === 'vox' || provider === 'both';
}

export function isPrebidEnabled(provider: AdsProvider): boolean {
  return provider === 'prebid' || provider === 'both';
}
