'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { isVoxEnabled, useAdsProvider } from '@/lib/ads-provider';
import { AD_PLACEMENTS } from '@/lib/config/adPlacements';
import { startVoxAdLifecycle } from '@/lib/vox-ad-lifecycle';

declare global {
  interface Window {
    _tx: any;
  }
}

const ENABLED_DISPLAY_PLACE_IDS = new Set(
  AD_PLACEMENTS.filter((ad) => ad.enabled).map((ad) => ad.placeId)
);

export function AdManager() {
  const pathname = usePathname();
  const provider = useAdsProvider();
  const { consentState } = useCookieConsent();
  const hasConsent = isVoxEnabled(provider) && consentState.hasConsented &&
    consentState.preferences.advertising;

  useEffect(() => {
    if (!hasConsent) return;
    return startVoxAdLifecycle({
      window,
      document,
      pathname: pathname || '',
      displayPlaceIds: ENABLED_DISPLAY_PLACE_IDS,
    });
  }, [hasConsent, pathname]);

  return null;
}
