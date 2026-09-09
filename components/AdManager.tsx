'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { isVoxEnabled, useAdsProvider } from '@/lib/ads-provider';
import { AD_PLACEMENTS } from '@/lib/config/adPlacements';

declare global {
  interface Window {
    _tx: any;
  }
}

const IN_IMAGE_PLACE_ID = "63d93bb54d506e95f039e2e3";
// Late-container retries only. The FIRST init runs the moment the SDK is ready
// (see runWhenSdkReady) — it used to wait for the 500ms timer on every pageview.
const RETRY_DELAYS_MS = [500, 2500];
const ENABLED_DISPLAY_PLACE_IDS = new Set(
  AD_PLACEMENTS.filter((ad) => ad.enabled).map((ad) => ad.placeId)
);

export function AdManager() {
  const pathname = usePathname();
  const provider = useAdsProvider();
  const { consentState } = useCookieConsent();
  // On a prebid-only deployment (web.icoffio.com) VOX must not load at all.
  const hasConsent =
    isVoxEnabled(provider) &&
    consentState.hasConsented &&
    consentState.preferences.advertising;
  const scriptLoaded = useRef(false);
  const retryTimersRef = useRef<number[]>([]);
  const observerRef = useRef<MutationObserver | null>(null);
  const mutationDebounceRef = useRef<number | null>(null);
  const lastMutationScheduleRef = useRef(0);
  const lastInImagePathRef = useRef<string | null>(null);

  const clearRetryTimers = useCallback(() => {
    retryTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    retryTimersRef.current = [];
  }, []);

  const clearMutationDebounce = useCallback(() => {
    if (mutationDebounceRef.current !== null) {
      window.clearTimeout(mutationDebounceRef.current);
      mutationDebounceRef.current = null;
    }
  }, []);

  // VOX SDK expects window._tx.cmds queue to exist before script execution.
  const ensureTxQueue = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window._tx || typeof window._tx !== 'object') {
      window._tx = {};
    }
    if (!Array.isArray(window._tx.cmds)) {
      window._tx.cmds = [];
    }
  }, []);

  // 1. Initialize VOX logic with safe retries and per-container attempt tracking.
  const initVOX = useCallback((reason: string) => {
    if (!hasConsent) return;
    if (typeof window._tx === 'undefined' || !window._tx.integrateInImage || !window._tx.init) return;

    try {
      const currentPath = pathname || '';
      const isArticlePage = currentPath.includes('/article/');
      const shouldInitInImage = isArticlePage && lastInImagePathRef.current !== currentPath;
      // Display slots are registered by _tx.init() itself: it scans every
      // [data-hyb-ssp-ad-place] container, stamps data-hyb-ssp-ad-place-status on
      // the ones it took, and skips those on later calls. So the only question is
      // whether a visible, enabled container is still unregistered. (This used to
      // call integrateInImage() once per display PlaceID as well — a no-op
      // without an image selector that only left 11–13 duplicate registrations
      // in the SDK per pageview.)
      const unregisteredDisplay = Array.from(
        document.querySelectorAll<HTMLElement>('[data-hyb-ssp-ad-place]')
      ).filter((container) => {
        const placeId = container.dataset.hybSspAdPlace;
        if (!placeId || !ENABLED_DISPLAY_PLACE_IDS.has(placeId)) return false;
        if (container.dataset.adStatus === 'unsuitable') return false;
        if (container.dataset.hybSspAdPlaceStatus) return false;
        // Responsive hiding (xl:hidden) lives on the wrapper, so the container's
        // own computed display is never "none"; an empty rect list is the reliable
        // signal for "inside a display:none subtree".
        return container.getClientRects().length > 0;
      }).length;

      // A. In-image ads only on article pages. The image selector comes from
      // VOX's server-side placement config (fetchSelector). `excludeSelectors`
      // is not part of the SDK API — it was silently dropped — so exclusions
      // have to be configured on the VOX side.
      if (shouldInitInImage) {
        window._tx.integrateInImage({ placeId: IN_IMAGE_PLACE_ID, fetchSelector: true });
        lastInImagePathRef.current = currentPath;
      } else if (!isArticlePage) {
        // Reset when leaving article pages to allow next article-path init.
        lastInImagePathRef.current = null;
      }

      // B. Trigger init if we have work to do.
      if (shouldInitInImage || unregisteredDisplay > 0) {
        window._tx.init();
      }
    } catch (err) {
      console.error('VOX init error:', err);
    }
  }, [hasConsent, pathname]);

  const scheduleInitRetries = useCallback((reason: string) => {
    if (reason.startsWith('dom-mutation')) {
      const now = Date.now();
      if (now - lastMutationScheduleRef.current < 1200) {
        return;
      }
      lastMutationScheduleRef.current = now;
    }

    clearRetryTimers();

    RETRY_DELAYS_MS.forEach((delay) => {
      const timerId = window.setTimeout(() => {
        initVOX(`${reason}:${delay}ms`);
      }, delay);
      retryTimersRef.current.push(timerId);
    });
  }, [clearRetryTimers, initVOX]);

  // Run the first init the moment the SDK is usable — synchronously if it is
  // already on the page (the <head> loader in layout.tsx normally gets it there
  // before hydration), otherwise from the SDK's own command queue, which it
  // drains on load — and only then fall back to the timed retries for
  // containers that appear later. Measured before this change: the first init
  // never ran earlier than 500ms after the script loaded.
  const runWhenSdkReady = useCallback((reason: string) => {
    ensureTxQueue();
    scriptLoaded.current = true;
    if (window._tx.integrateInImage && window._tx.init) {
      initVOX(`${reason}:now`);
      scheduleInitRetries(reason);
      return;
    }
    window._tx.cmds.push(() => {
      initVOX(`${reason}:sdk-ready`);
      scheduleInitRetries(reason);
    });
  }, [ensureTxQueue, initVOX, scheduleInitRetries]);

  // 2. Load script when consent is granted.
  useEffect(() => {
    if (!hasConsent) {
      scriptLoaded.current = false;
      clearRetryTimers();
      clearMutationDebounce();
      return;
    }

    ensureTxQueue();

    // Already requested — by the <head> loader, a previous mount or a cached
    // shell. Loaded or still in flight, the command queue covers both cases; a
    // `load` listener would miss a script that finished before we mounted.
    if (document.querySelector('script[data-vox-ssp="1"]')) {
      runWhenSdkReady('script-present');
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://st.hbrd.io/ssp.js";
    script.dataset.voxSsp = "1";
    script.onload = () => runWhenSdkReady('script-load');
    script.onerror = () => {
      console.error('VOX script failed to load');
    };
    (document.head || document.body).appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clearMutationDebounce, clearRetryTimers, ensureTxQueue, hasConsent, runWhenSdkReady]);

  // 3. Re-init on route changes and when ad containers appear later.
  useEffect(() => {
    if (!hasConsent || !scriptLoaded.current) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      clearRetryTimers();
      clearMutationDebounce();
      return;
    }

    scheduleInitRetries('route-change');

    observerRef.current?.disconnect();
    const observer = new MutationObserver((mutations) => {
      const shouldRetry = mutations.some((mutation) => {
        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
          return false;
        }
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          if (node.matches('[data-hyb-ssp-ad-place]')) return true;
          return node.querySelector('[data-hyb-ssp-ad-place]') !== null;
        });
      });

      if (shouldRetry) {
        clearMutationDebounce();
        mutationDebounceRef.current = window.setTimeout(() => {
          scheduleInitRetries('dom-mutation');
        }, 450);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      clearRetryTimers();
      clearMutationDebounce();
    };
  }, [clearMutationDebounce, clearRetryTimers, hasConsent, pathname, scheduleInitRetries]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      clearRetryTimers();
      clearMutationDebounce();
    };
  }, [clearMutationDebounce, clearRetryTimers]);

  return null; // This component does not render anything visible
}
