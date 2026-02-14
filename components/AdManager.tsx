'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { AD_PLACEMENTS } from '@/lib/config/adPlacements';

declare global {
  interface Window {
    _tx: any;
  }
}

const IN_IMAGE_PLACE_ID = "63d93bb54d506e95f039e2e3";

export function AdManager() {
  const pathname = usePathname();
  const { consentState } = useCookieConsent();
  const hasConsent = consentState.hasConsented && consentState.preferences.advertising;
  const scriptLoaded = useRef(false);

  // 1. Load Script when consent is granted
  useEffect(() => {
    if (hasConsent && !scriptLoaded.current) {
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = "https://st.hbrd.io/ssp.js";
      s.onload = () => {
        scriptLoaded.current = true;
        initVOX(); // Init immediately after load
      };
      (document.head || document.body).appendChild(s);
    }
  }, [hasConsent]);

  // 2. Initialize VOX Logic
  const initVOX = () => {
    if (!hasConsent) return;
    if (typeof window._tx === 'undefined' || !window._tx.integrateInImage) return;

    try {
      const isArticlePage = pathname?.includes('/article/');

      // A. In-Image Ads (Only on Article Pages)
      if (isArticlePage) {
        window._tx.integrateInImage({
          placeId: IN_IMAGE_PLACE_ID,
          fetchSelector: true,
          excludeSelectors: [
            '.group img',
            '[class*="aspect-"] img',
            'nav img',
            'header img',
            'footer img',
            'a[href*="/article/"] img:not(.prose img):not(article > div > img)'
          ].join(', ')
        });
      }

      // B. Display Ads (UniversalAd placeholders)
      const activePlacements = AD_PLACEMENTS.filter(ad => ad.enabled);
      activePlacements.forEach(p => {
        if (document.querySelector(`[data-hyb-ssp-ad-place="${p.placeId}"]`)) {
          window._tx.integrateInImage({ placeId: p.placeId, setDisplayBlock: true });
        }
      });

      // C. Trigger Init
      if (document.querySelectorAll('[data-hyb-ssp-ad-place]').length > 0 || isArticlePage) {
        window._tx.init();
        console.log('VOX: Init triggered for', pathname);
      }
    } catch (err) {
      console.error('VOX init error:', err);
    }
  };

  // 3. Re-init on Route Change
  useEffect(() => {
    if (scriptLoaded.current && hasConsent) {
      // Small timeout to allow new DOM to render
      const timer = setTimeout(() => {
        initVOX();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pathname, hasConsent]);

  return null; // This component does not render anything visible
}
