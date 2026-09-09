'use client';

import { useEffect } from 'react';
import { isPrebidEnabled, useAdsProvider } from '@/lib/ads-provider';
import { getCmpScript } from '@/lib/config/cmp';

const SCRIPT_ATTR = 'data-cmp-loader';

/**
 * Loads the IAB TCF v2.2 CMP on Prebid hosts.
 *
 * Ordering matters: Prebid's consentManagementTcf module polls for
 * `window.__tcfapi` and cancels the auction if it never appears, so the CMP tag
 * goes in as early as the client can manage — before PrebidManager requests the
 * Bidio SDK. The CMP itself installs the `__tcfapi` stub synchronously once its
 * script runs, and Prebid waits for the real answer.
 *
 * Renders nothing on VOX hosts, so icoffio.com and app.icoffio.com are
 * untouched and keep their existing cookie banner.
 */
export function CmpLoader() {
  const provider = useAdsProvider();
  const enabled = isPrebidEnabled(provider);

  useEffect(() => {
    if (!enabled) return;

    const cmp = getCmpScript();
    if (!cmp) {
      console.warn(
        '[CMP] not configured — Prebid will cancel every auction with "TCF2 CMP not found". Set CMP_PROVIDER and CMP_ID in lib/config/cmp.ts.'
      );
      return;
    }

    if (document.querySelector(`script[${SCRIPT_ATTR}]`)) return;

    const script = document.createElement('script');
    script.src = cmp.src;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, '1');
    Object.entries(cmp.attributes).forEach(([key, value]) => script.setAttribute(key, value));
    script.onerror = () => console.error('[CMP] failed to load', cmp.src);
    script.onload = () => console.log('[CMP] loaded', cmp.src);
    (document.head || document.body).appendChild(script);
  }, [enabled]);

  return null;
}
