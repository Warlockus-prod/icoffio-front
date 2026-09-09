'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ADS_PROVIDER_FALLBACK,
  allowsAdsOverride,
  normalizeAdsProvider,
  resolveAdsProviderForHost,
  type AdsProvider,
} from './ads-provider-core';

export type { AdsProvider };
export { isPrebidEnabled, isVoxEnabled, PREBID_HOSTS } from './ads-provider-core';

const OVERRIDE_KEY = 'icoffio_ads_provider_override';

/**
 * Seeded by the root layout from the request's Host header so server and client
 * agree on the first render. Without it a client-only guess would render one ad
 * stack on the server and swap it on hydration.
 */
const AdsProviderContext = createContext<AdsProvider | null>(null);

export function AdsProviderProvider({
  value,
  children,
}: {
  value: AdsProvider;
  children: ReactNode;
}) {
  return <AdsProviderContext.Provider value={value}>{children}</AdsProviderContext.Provider>;
}

export function useAdsProvider(): AdsProvider {
  const fromServer = useContext(AdsProviderContext);
  const [provider, setProvider] = useState<AdsProvider>(fromServer ?? ADS_PROVIDER_FALLBACK);

  useEffect(() => {
    // Re-resolve on the client so a missing provider (or a stale cached shell)
    // still lands on the right stack for this hostname.
    const host = window.location.hostname;
    const base = fromServer ?? resolveAdsProviderForHost(host);

    if (!allowsAdsOverride(host)) {
      setProvider(base);
      return;
    }

    try {
      const fromQuery = normalizeAdsProvider(new URLSearchParams(window.location.search).get('ads'));
      if (fromQuery) {
        window.sessionStorage.setItem(OVERRIDE_KEY, fromQuery);
        setProvider(fromQuery);
        return;
      }
      const stored = normalizeAdsProvider(window.sessionStorage.getItem(OVERRIDE_KEY));
      setProvider(stored ?? base);
    } catch {
      // sessionStorage unavailable (private mode) — keep the resolved value.
      setProvider(base);
    }
  }, [fromServer]);

  return provider;
}
