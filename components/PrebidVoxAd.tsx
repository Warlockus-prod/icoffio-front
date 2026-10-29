'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdFormat, AdPlacement } from '@/components/UniversalAd';
import { BIDIO_PREBID_GLOBAL } from '@/lib/config/prebidPlacements';
import {
  buildVoxBannerUnit,
  nextUnitCode,
  onPrebidReady,
  renderVoxBanner,
  requestVoxBid,
} from '@/lib/prebid-vox';

interface PrebidVoxAdProps {
  placeId: string;
  format: AdFormat;
  placement?: AdPlacement;
  className?: string;
}

/**
 * A VOX display place on a Prebid host: one Prebid auction with the `vox`
 * bidder for this placeId, rendered into a frame of the place's size.
 *
 * The auction waits until the slot is near the viewport. A slot inside a
 * breakpoint wrapper that is display:none (mobile slot on desktop and back)
 * never intersects, so it never bids — the same rule UniversalAd keeps for VOX.
 * Rendered by UniversalAd for places with `prebid: true`.
 */
export function PrebidVoxAd({ placeId, format, placement = 'inline', className = '' }: PrebidVoxAdProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);
  const [width, height] = format.split('x').map(Number) as [number, number];

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let removeCreative: (() => void) | null = null;

    const auction = async () => {
      const unit = buildVoxBannerUnit(nextUnitCode('banner'), placeId, [width, height]);
      const bid = await requestVoxBid(window, BIDIO_PREBID_GLOBAL, unit);
      if (cancelled) return;
      if (!bid) {
        console.log(`[Bidio] vox ${format} ${unit.code}: no bid`);
        return;
      }
      try {
        removeCreative = renderVoxBanner(window, document, BIDIO_PREBID_GLOBAL, bid, slot, [width, height]);
        if (removeCreative) {
          setFilled(true);
          console.log(`[Bidio] vox ${format} ${unit.code}: ${bid.bidder} ${bid.cpm} rendered`);
        }
      } catch (error) {
        console.error('[Bidio] vox banner error:', error);
      }
    };

    const stopReady = onPrebidReady(window, () => {
      if (cancelled) return;
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        auction();
      }, { rootMargin: '300px 0px' });
      observer.observe(slot);
    });

    return () => {
      cancelled = true;
      stopReady();
      observer?.disconnect();
      removeCreative?.();
      setFilled(false);
    };
  }, [placeId, format, width, height]);

  return (
    <div
      ref={slotRef}
      data-prebid-vox={placeId}
      data-ad-format={format}
      data-ad-placement={placement}
      data-prebid-filled={filled ? 'true' : 'false'}
      className={`vox-ad-container vox-${placement}-ad ${className}`.trim()}
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        minHeight: filled ? `${height}px` : 0,
        marginLeft: 'auto',
        marginRight: 'auto',
        overflow: 'hidden',
        background: 'transparent',
      }}
    />
  );
}
