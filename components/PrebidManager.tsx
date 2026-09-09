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
   * TCF CMP cancels every auction.
   *
   * Merged, never replaced: setConfig overwrites the whole `consentManagement`
   * object, and a bare {gdpr,tcf} wipes Bidio's static `usp` consent (observed
   * live as a flood of "consentManagement.usp config not defined").
   */
  const applyTcfBypass = useCallback(() => {
    if (!shouldBypassTcfForTest()) return;
    const pbjs = (window as any)[BIDIO_PREBID_GLOBAL];
    if (!pbjs || typeof pbjs.setConfig !== 'function') return;

    try {
      const current = pbjs.getConfig?.('consentManagement') ?? {};
      if (current?.gdpr?.defaultGdprScope === false) return; // already relaxed

      pbjs.setConfig({
        consentManagement: {
          ...current,
          gdpr: { ...current.gdpr, defaultGdprScope: false, timeout: 1000 },
          tcf: { ...current.tcf, defaultGdprScope: false, timeout: 1000 },
        },
      });
    } catch (err) {
      console.error('[Bidio] TCF bypass setConfig failed', err);
    }
  }, []);

  /**
   * Bidio runs exactly one auction, and it is cancelled the moment it starts —
   * re-applying config afterwards is too late, and nothing retries. So the
   * bypass has to be in place *before* their requestBids call. Wrapping
   * requestBids is the only ordering that reliably wins: Bidio configures
   * Prebid after us, but it must go through this function to bid.
   */
  const patchRequestBids = useCallback((): boolean => {
    if (!shouldBypassTcfForTest()) return true;
    const pbjs = (window as any)[BIDIO_PREBID_GLOBAL];
    if (!pbjs) return false;
    if (pbjs.__icoffioTcfPatched) return true;
    if (typeof pbjs.requestBids !== 'function') return false;

    const original = pbjs.requestBids.bind(pbjs);
    pbjs.__icoffioTcfPatched = true;
    pbjs.requestBids = (...args: unknown[]) => {
      applyTcfBypass();
      return original(...args);
    };
    console.warn('[Bidio] TEST MODE: TCF gate relaxed for the next auction');
    return true;
  }, [applyTcfBypass]);

  const initBidio = useCallback(() => {
    if (initialisedRef.current) return;
    const bidio = window.bidio;
    if (!bidio || typeof bidio.init !== 'function') return;

    initialisedRef.current = true;
    try {
      // Prebid does not exist until Bidio's SDK creates it, so poll for it and
      // wrap requestBids the instant it appears. Bidio only bids after a round
      // trip to as.bidio.pl, which gives this loop time to win the race.
      if (shouldBypassTcfForTest() && bypassTimerRef.current === null && !patchRequestBids()) {
        const startedAt = Date.now();
        bypassTimerRef.current = window.setInterval(() => {
          const done = patchRequestBids();
          if ((done || Date.now() - startedAt > 20000) && bypassTimerRef.current !== null) {
            window.clearInterval(bypassTimerRef.current);
            bypassTimerRef.current = null;
          }
        }, 25);
      }

      bidio.init({
        websiteId: BIDIO_WEBSITE_ID,
        prebidGlobal: BIDIO_PREBID_GLOBAL,
      });

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
  }, [patchRequestBids]);

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
      // Claim pbjs.que before the SDK loads. Prebid drains this queue the moment
      // it initialises — earlier than any polling can reach it, and earlier than
      // Bidio's own auction, which is queued after ours. Measured on the live
      // subdomain: patching after bidio.init() always lost the race, the console
      // showed "init ok" before the patch and the auction was already cancelled.
      if (shouldBypassTcfForTest()) {
        const w = window as any;
        w[BIDIO_PREBID_GLOBAL] = w[BIDIO_PREBID_GLOBAL] || {};
        w[BIDIO_PREBID_GLOBAL].que = w[BIDIO_PREBID_GLOBAL].que || [];
        w[BIDIO_PREBID_GLOBAL].que.push(() => {
          patchRequestBids();
          applyTcfBypass();
        });
      }

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
  }, [applyTcfBypass, enabled, hasConsent, initBidio, patchRequestBids, tcfConsent]);

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
