'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { AD_PLACEMENTS } from '@/lib/config/adPlacements';

declare global {
  interface Window {
    _tx: any;
  }
}

const IN_IMAGE_PLACE_ID = "63d93bb54d506e95f039e2e3";
const RETRY_DELAYS_MS = [500, 2500];
const MAX_CONTAINER_INIT_ATTEMPTS = 3;
const ENABLED_DISPLAY_PLACE_IDS = new Set(
  AD_PLACEMENTS.filter((ad) => ad.enabled).map((ad) => ad.placeId)
);

export function AdManager() {
  const pathname = usePathname();
  const { consentState } = useCookieConsent();
  const hasConsent = consentState.hasConsented && consentState.preferences.advertising;
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

  const hasContainerContent = (container: HTMLElement): boolean => {
    return (
      container.children.length > 0 ||
      container.querySelector('iframe') !== null ||
      container.innerHTML.trim() !== ''
    );
  };

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
      const displayPlaceIdsToInit = new Set<string>();
      const adContainers = Array.from(
        document.querySelectorAll<HTMLElement>('[data-hyb-ssp-ad-place]')
      );

      adContainers.forEach((container) => {
        const placeId = container.dataset.hybSspAdPlace;
        if (!placeId || !ENABLED_DISPLAY_PLACE_IDS.has(placeId)) return;
        if (container.dataset.adStatus === 'unsuitable') return;

        // Skip CSS-hidden placeholders from responsive breakpoints.
        const computed = window.getComputedStyle(container);
        if (computed.display === 'none' || computed.visibility === 'hidden') return;

        if (hasContainerContent(container)) return;

        const attempts = Number.parseInt(container.dataset.voxInitAttempts || '0', 10);
        if (attempts >= MAX_CONTAINER_INIT_ATTEMPTS) return;

        container.dataset.voxInitAttempts = String(attempts + 1);
        displayPlaceIdsToInit.add(placeId);
      });

      // A. In-image ads only on article pages.
      if (shouldInitInImage) {
        window._tx.integrateInImage({
          placeId: IN_IMAGE_PLACE_ID,
          fetchSelector: true,
          excludeSelectors: [
            '[data-no-inimage] img',
            '[data-related-articles] img',
            '[data-article-card] img',
            'a[href*="/article/"] img',
            '.group img',
            '[class*="aspect-"] img',
            'nav img',
            'header img',
            'footer img'
          ].join(', ')
        });
        lastInImagePathRef.current = currentPath;
      } else if (!isArticlePage) {
        // Reset when leaving article pages to allow next article-path init.
        lastInImagePathRef.current = null;
      }

      // B. Display placements only for containers currently in DOM.
      displayPlaceIdsToInit.forEach((placeId) => {
        window._tx.integrateInImage({ placeId, setDisplayBlock: true });
      });

      // C. Trigger init if we have work to do.
      if (shouldInitInImage || displayPlaceIdsToInit.size > 0) {
        window._tx.init();
        console.log(
          `[VOX] init (${reason}) path=${pathname} inImage=${shouldInitInImage} display=${displayPlaceIdsToInit.size}`
        );
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

  // 2. Load script when consent is granted.
  useEffect(() => {
    if (!hasConsent) {
      scriptLoaded.current = false;
      clearRetryTimers();
      clearMutationDebounce();
      return;
    }

    ensureTxQueue();

    if (typeof window._tx !== 'undefined' && window._tx.integrateInImage) {
      scriptLoaded.current = true;
      scheduleInitRetries('script-ready');
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-vox-ssp="1"]');

    const onScriptLoad = () => {
      ensureTxQueue();
      scriptLoaded.current = true;
      scheduleInitRetries('script-load');
    };

    if (existingScript) {
      existingScript.addEventListener('load', onScriptLoad, { once: true });
      const readyPoll = window.setTimeout(() => {
        if (window._tx && window._tx.integrateInImage) {
          onScriptLoad();
        }
      }, 250);
      return () => {
        window.clearTimeout(readyPoll);
        existingScript.removeEventListener('load', onScriptLoad);
      };
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://st.hbrd.io/ssp.js";
    script.dataset.voxSsp = "1";
    script.onload = onScriptLoad;
    script.onerror = () => {
      console.error('VOX script failed to load');
    };
    (document.head || document.body).appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clearMutationDebounce, clearRetryTimers, ensureTxQueue, hasConsent, scheduleInitRetries]);

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
