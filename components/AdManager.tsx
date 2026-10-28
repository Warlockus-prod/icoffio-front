'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { isVoxEnabled, isVoxInImageEnabled, useAdsProvider } from '@/lib/ads-provider';
import { AD_PLACEMENTS } from '@/lib/config/adPlacements';
import { startVoxAdLifecycle } from '@/lib/vox-ad-lifecycle';
import { startAdTelemetry } from '@/lib/ad-telemetry';

declare global {
  interface Window {
    _tx: any;
  }
}

const ENABLED_DISPLAY_PLACE_IDS: ReadonlySet<string> = new Set(
  AD_PLACEMENTS.filter((ad) => ad.enabled).map((ad) => ad.placeId)
);
const NO_DISPLAY_PLACE_IDS: ReadonlySet<string> = new Set();

export function AdManager() {
  const pathname = usePathname();
  const provider = useAdsProvider();
  const { consentState } = useCookieConsent();
  // On Prebid hosts the SDK still runs, for in-image only: display is Prebid's.
  const voxDisplay = isVoxEnabled(provider);
  const hasConsent = isVoxInImageEnabled(provider) && consentState.hasConsented &&
    consentState.preferences.advertising;

  // Site-side accounting of auction outcomes (filled / empty) per place.
  useEffect(() => {
    if (!hasConsent) return;
    // One observer for the whole session: it sees every status change, including
    // containers added by client-side navigation, and never counts one twice.
    return startAdTelemetry(window, document);
  }, [hasConsent]);

  useEffect(() => {
    if (!hasConsent) return;
    return startVoxAdLifecycle({
      window,
      document,
      pathname: pathname || '',
      displayPlaceIds: voxDisplay ? ENABLED_DISPLAY_PLACE_IDS : NO_DISPLAY_PLACE_IDS,
    });
  }, [hasConsent, pathname, voxDisplay]);

  return null;
}
