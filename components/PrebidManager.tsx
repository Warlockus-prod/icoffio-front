'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { useTcfConsent } from '@/lib/useTcfConsent';
import { isPrebidEnabled, useAdsProvider } from '@/lib/ads-provider';
import { shouldBypassTcfForTest } from '@/lib/config/cmp';
import {
  BIDIO_PREBID_GLOBAL,
  BIDIO_REINIT_ON_ROUTE_CHANGE,
  BIDIO_SDK_URL,
  BIDIO_WEBSITE_ID,
} from '@/lib/config/prebidPlacements';

declare global {
  interface Window {
    bidio?: any;
    pbjs?: any;
  }
}

const SCRIPT_ATTR = 'data-bidio-sdk';

/**
 * Loads the Bidio Prebid wrapper and initialises it.
 *
 * Partner tag (for reference):
 *   <script>
 *     window.addEventListener('BidioReady', function () {
 *       bidio.init({ websiteId: '...', prebidGlobal: 'pbjs' });
 *     });
 *   </script>
 *   <script async defer src="https://files.bidio.pl/bidio-sdk-dev.js"></script>
 *
 * Two deliberate differences from the raw tag:
 *
 * 1. The SDK is injected after advertising consent is granted, not in <head>.
 *    Loading a bidding wrapper before consent would break GDPR, and the site
 *    already gates VOX the same way. Cost: bidding starts a little later.
 *
 * 2. The `BidioReady` listener is attached immediately before the script is
 *    appended, so the event can never fire before we are listening. We also call
 *    init() directly in case the SDK is already on the page (component remount,
 *    bfcache restore), guarded by a ref so init runs exactly once.
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

  const initialisedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const bypassTimerRef = useRef<number | null>(null);

  /**
   * TEST ONLY. Bidio's Prebid config sets defaultGdprScope: true, so a missing
   * TCF CMP cancels every auction. Relaxing it lets the auction run.
   *
   * Applied on a short interval because Bidio writes its own consent config
   * during init and may rewrite it before an auction — setConfig is idempotent,
   * so re-applying is harmless and wins whichever order they land in.
   */
  const applyTcfBypass = useCallback(() => {
    if (!shouldBypassTcfForTest()) return;
    const pbjs = (window as any)[BIDIO_PREBID_GLOBAL];
    if (!pbjs || typeof pbjs.setConfig !== 'function') return;

    const relaxed = { cmpApi: 'iab', timeout: 1000, defaultGdprScope: false };
    try {
      pbjs.setConfig({ consentManagement: { gdpr: relaxed, tcf: relaxed } });
    } catch (err) {
      console.error('[Bidio] TCF bypass setConfig failed', err);
    }
  }, []);

  const initBidio = useCallback(() => {
    if (initialisedRef.current) return;
    const bidio = window.bidio;
    if (!bidio || typeof bidio.init !== 'function') return;

    initialisedRef.current = true;
    try {
      bidio.init({
        websiteId: BIDIO_WEBSITE_ID,
        prebidGlobal: BIDIO_PREBID_GLOBAL,
      });
      if (shouldBypassTcfForTest()) {
        console.warn(
          '[Bidio] TEST MODE: relaxing Prebid defaultGdprScope so auctions run without a TCF CMP. Not a launch configuration — see lib/config/cmp.ts.'
        );
        applyTcfBypass();
        if (bypassTimerRef.current === null) {
          const startedAt = Date.now();
          bypassTimerRef.current = window.setInterval(() => {
            applyTcfBypass();
            if (Date.now() - startedAt > 20000 && bypassTimerRef.current !== null) {
              window.clearInterval(bypassTimerRef.current);
              bypassTimerRef.current = null;
            }
          }, 150);
        }
      }

      console.log('[Bidio] init ok', {
        websiteId: BIDIO_WEBSITE_ID,
        prebidGlobal: BIDIO_PREBID_GLOBAL,
        // Logged so we can discover the wrapper's refresh API on the live site.
        api: Object.keys(bidio),
      });
    } catch (err) {
      initialisedRef.current = false;
      console.error('[Bidio] init failed', err);
    }
  }, [applyTcfBypass]);

  useEffect(() => {
    return () => {
      if (bypassTimerRef.current !== null) {
        window.clearInterval(bypassTimerRef.current);
        bypassTimerRef.current = null;
      }
    };
  }, []);

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

    window.addEventListener('BidioReady', initBidio);

    // SDK may already be present from an earlier mount.
    initBidio();

    if (!document.querySelector(`script[${SCRIPT_ATTR}]`)) {
      const script = document.createElement('script');
      script.src = BIDIO_SDK_URL;
      script.async = true;
      script.defer = true;
      script.setAttribute(SCRIPT_ATTR, '1');
      script.onerror = () => console.error('[Bidio] SDK failed to load', BIDIO_SDK_URL);
      (document.head || document.body).appendChild(script);
      console.log('[Bidio] SDK requested', BIDIO_SDK_URL);
    }

    return () => {
      window.removeEventListener('BidioReady', initBidio);
    };
  }, [enabled, hasConsent, initBidio, tcfConsent]);

  // Client-side navigation replaces the slot <div>s with fresh empty ones, so
  // the wrapper has to fill them again. SDK v1.0.6 exposes only getVersion and
  // init, so re-running init is the only lever available. A dedicated refresh
  // method is preferred whenever the partner ships one.
  useEffect(() => {
    if (!enabled) return;

    const previousPath = lastPathRef.current;
    lastPathRef.current = pathname;

    if (previousPath === null || previousPath === pathname) return;
    if (!initialisedRef.current) return;

    const bidio = window.bidio;
    if (!bidio) return;

    const refreshMethod = ['refresh', 'refreshAll', 'reload', 'reinit'].find(
      (name) => typeof bidio[name] === 'function'
    );

    if (refreshMethod) {
      try {
        bidio[refreshMethod]();
        console.log(`[Bidio] ${refreshMethod}() after route change → ${pathname}`);
      } catch (err) {
        console.error(`[Bidio] ${refreshMethod}() failed`, err);
      }
      return;
    }

    if (!BIDIO_REINIT_ON_ROUTE_CHANGE) {
      console.warn(
        '[Bidio] no refresh API and re-init disabled — slots stay empty after client-side navigation. Available:',
        Object.keys(bidio)
      );
      return;
    }

    console.log(`[Bidio] re-init after route change → ${pathname}`);
    initialisedRef.current = false;
    initBidio();
  }, [enabled, initBidio, pathname]);

  return null;
}
