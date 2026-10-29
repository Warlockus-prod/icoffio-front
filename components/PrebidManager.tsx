'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { useTcfConsent } from '@/lib/useTcfConsent';
import { isPrebidEnabled, isPrebidInImageEnabled, useAdsProvider } from '@/lib/ads-provider';
import { startPrebidInImage } from '@/lib/prebid-inimage';
import { markPrebidReady } from '@/lib/prebid-vox';
import {
  BIDIO_FULL_RELOAD_NAVIGATION,
  BIDIO_GDPR_ENABLED,
  BIDIO_PREBID_GLOBAL,
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
const LOADED_ATTR = 'data-bidio-loaded';

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
  const [sdkLoaded, setSdkLoaded] = useState(false);

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

    const existing = document.querySelector(`script[${SCRIPT_ATTR}]`);
    if (existing) {
      if (existing.hasAttribute(LOADED_ATTR)) setSdkLoaded(true);
      else existing.addEventListener('load', () => setSdkLoaded(true), { once: true });
      return;
    }

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
    script.onload = () => {
      script.setAttribute(LOADED_ATTR, '1');
      setSdkLoaded(true);
      console.log('[Bidio] lazy SDK loaded', window.BIDIO_LAZY_CONFIG);
    };
    (document.head || document.body).appendChild(script);
    console.log('[Bidio] SDK requested', BIDIO_SDK_URL);
  }, [enabled, hasConsent, tcfConsent]);

  // In-image, VOX banner and video auctions run on Bidio's pbjs. They start
  // only after the lazy SDK has executed: it queues setConfig (currency,
  // consent) on pbjs.que, and our requestBids must come after it in that queue.
  useEffect(() => {
    if (enabled && hasConsent && sdkLoaded) markPrebidReady(window);
  }, [enabled, hasConsent, sdkLoaded]);

  useEffect(() => {
    if (!enabled || !hasConsent || !sdkLoaded || !isPrebidInImageEnabled(provider)) return;
    return startPrebidInImage({
      window,
      document,
      pathname: pathname || '',
      prebidGlobal: BIDIO_PREBID_GLOBAL,
    });
  }, [enabled, hasConsent, sdkLoaded, provider, pathname]);

  // The lazy SDK initialises once per document and cannot refill slots after a
  // client-side navigation (measured: 0 new auctions, slots empty). So on Prebid
  // hosts, internal link clicks become full document loads. Capture phase on
  // `document` runs before React's root listener, so Next's <Link> never starts
  // its own transition.
  useEffect(() => {
    // No consent means no SDK, so there is nothing to re-initialise.
    if (!enabled || !hasConsent || !BIDIO_FULL_RELOAD_NAVIGATION) return;

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same document (pure #hash jump): nothing to re-initialise.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(url.href);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, hasConsent]);

  // Fallback for navigations the click hook cannot see — back/forward, and
  // programmatic router.push. The URL has already changed, so a reload lands
  // on the new page with a fresh SDK. A remount resets the ref, so this cannot
  // loop.
  useEffect(() => {
    if (!enabled) return;

    const previousPath = lastPathRef.current;
    lastPathRef.current = pathname;
    if (previousPath === null || previousPath === pathname) return;

    if (BIDIO_FULL_RELOAD_NAVIGATION && hasConsent) {
      console.log(`[Bidio] client-side route change → ${pathname}; reloading so the lazy SDK re-initialises`);
      window.location.reload();
      return;
    }

    console.log(`[Bidio] route change → ${pathname} (lazy SDK has no refresh API; slots will stay empty)`);
  }, [enabled, hasConsent, pathname]);

  return null;
}
