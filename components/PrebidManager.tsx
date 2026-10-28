'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { useTcfConsent } from '@/lib/useTcfConsent';
import { isPrebidEnabled, useAdsProvider } from '@/lib/ads-provider';
import {
  BIDIO_GDPR_ENABLED,
  BIDIO_SDK_URL,
  buildBidioLazyConfig,
} from '@/lib/config/prebidPlacements';

declare global {
  interface Window {
    BIDIO_LAZY_CONFIG?: Record<string, unknown>;
    pbjs?: any;
  }
}

const SCRIPT_ATTR = 'data-bidio-sdk';

/**
 * Loads the Bidio lazy Prebid wrapper.
 *
 * Partner tag (2026-10-28 build):
 *   <script>window.BIDIO_LAZY_CONFIG = { websiteId: '...' }</script>
 *   <script async src="https://files.bidio.pl/bidio-lazy.min.js"></script>
 *
 * The SDK reads BIDIO_LAZY_CONFIG once and synchronously, then wires itself up
 * on DOMContentLoaded — there is no init call, no ready event and no global to
 * hook. So the config assignment has to happen before the script tag is
 * appended, which is exactly what this component does.
 *
 * One deliberate difference from the raw tag: the script is injected only after
 * advertising consent, not in <head>. A bidding wrapper that loads before
 * consent would break GDPR, and the site gates VOX the same way. The cost is
 * that bidding starts a little later.
 */
export function PrebidManager() {
  const pathname = usePathname();
  const provider = useAdsProvider();
  const { consentState } = useCookieConsent();
  const tcfConsent = useTcfConsent();

  const enabled = isPrebidEnabled(provider);
  // With a TCF CMP the CMP dialog is the consent UI, so the site's own banner
  // must not be required a second time. Without one, fall back to it.
  const hasConsent =
    tcfConsent !== null
      ? tcfConsent === 'granted'
      : consentState.hasConsented && consentState.preferences.advertising;

  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!hasConsent) {
      console.log(
        tcfConsent !== null
          ? `[Bidio] waiting for TCF consent (status=${tcfConsent}) — SDK not loaded`
          : '[Bidio] waiting for advertising consent — SDK not loaded'
      );
      return;
    }

    if (document.querySelector(`script[${SCRIPT_ATTR}]`)) return;

    // Must precede the script: the SDK snapshots this object as it executes.
    window.BIDIO_LAZY_CONFIG = buildBidioLazyConfig();

    if (!BIDIO_GDPR_ENABLED) {
      console.warn(
        '[Bidio] gdprEnabled=false — Prebid consentManagement is OFF. Vendor-supported test setting; must be true (plus a CMP) before real traffic.'
      );
    }

    const script = document.createElement('script');
    script.src = BIDIO_SDK_URL;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, '1');
    script.onerror = () => console.error('[Bidio] SDK failed to load', BIDIO_SDK_URL);
    script.onload = () => console.log('[Bidio] lazy SDK loaded', window.BIDIO_LAZY_CONFIG);
    (document.head || document.body).appendChild(script);
    console.log('[Bidio] SDK requested', BIDIO_SDK_URL);
  }, [enabled, hasConsent, tcfConsent]);

  // Client-side navigation swaps the slot <div>s for fresh empty ones. The lazy
  // build attaches its IntersectionObserver during its own startup and exposes
  // no refresh API, so slots created after that may never be requested. Logged
  // rather than guessed at: check this line against whether the slots fill
  // after an in-app navigation before adding any reload workaround.
  useEffect(() => {
    if (!enabled) return;

    const previousPath = lastPathRef.current;
    lastPathRef.current = pathname;
    if (previousPath === null || previousPath === pathname) return;

    const adUnits = window.pbjs?.adUnits?.length ?? 'n/a';
    console.log(
      `[Bidio] route change → ${pathname} (lazy SDK has no refresh API; pbjs adUnits=${adUnits})`
    );
  }, [enabled, pathname]);

  return null;
}
