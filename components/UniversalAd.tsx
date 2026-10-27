/**
 * UniversalAd — проверяет соответствие размера креатива ожидаемому формату
 * и скрывает неподходящие баннеры.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { isVoxEnabled, useAdsProvider } from '@/lib/ads-provider';

export type AdFormat =
  | '728x90' | '970x250'
  | '300x250' | '300x600'
  | '320x50' | '320x100'
  | '160x600' | '320x480';

export type AdPlacement = 'inline' | 'sidebar' | 'mobile' | 'display';

interface UniversalAdProps {
  placeId: string;
  format: AdFormat;
  placement?: AdPlacement;
  className?: string;
  enabled?: boolean;
}

const AD_DIMENSIONS: Record<AdFormat, { width: string; height: string }> = {
  '728x90': { width: '728px', height: '90px' },
  '970x250': { width: '970px', height: '250px' },
  '300x250': { width: '300px', height: '250px' },
  '300x600': { width: '300px', height: '600px' },
  '320x50': { width: '320px', height: '50px' },
  '320x100': { width: '320px', height: '100px' },
  '160x600': { width: '160px', height: '600px' },
  '320x480': { width: '320px', height: '480px' },
};

/** How far ahead of the viewport a slot enters the auction. */
const LAZY_MARGIN_PX = 300;

export function UniversalAd({
  placeId,
  format,
  placement = 'inline',
  className = '',
  enabled = true
}: UniversalAdProps) {
  const provider = useAdsProvider();
  // VOX slots are dead weight when the deployment runs Prebid only.
  const active = enabled && isVoxEnabled(provider);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  // The slot (and its data-hyb-ssp-ad-place attribute) only enters the DOM once
  // the breakpoint wrapper actually shows it. _tx.init() scans every container
  // on the page by itself, so a mobile 320×50 inside an `xl:hidden` wrapper used
  // to win an auction on desktop and burn a paid impression nobody could see.
  const [inLayout, setInLayout] = useState(false);
  const [adStatus, setAdStatus] = useState<'loading' | 'ready' | 'empty' | 'unsuitable'>('loading');
  const lastUnsuitableReasonRef = useRef<string>('');
  const evaluateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dimensions = AD_DIMENSIONS[format];
  const expectedWidth = Number.parseInt(dimensions.width, 10);
  const expectedHeight = Number.parseInt(dimensions.height, 10);
  const formatMaxWidth = dimensions.width;

  const parseSize = useCallback((value: string | null | undefined): number => {
    if (!value) return 0;
    const parsed = Number.parseFloat(value.replace('px', '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const resolveElementSize = useCallback((element: Element): { width: number; height: number } => {
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    const computed = window.getComputedStyle(htmlElement);

    const width = Math.max(
      rect.width,
      htmlElement.clientWidth || 0,
      htmlElement.scrollWidth || 0,
      parseSize(htmlElement.getAttribute('width')),
      parseSize(htmlElement.getAttribute('data-width')),
      parseSize(htmlElement.style.width),
      parseSize(computed.width)
    );

    const height = Math.max(
      rect.height,
      htmlElement.clientHeight || 0,
      htmlElement.scrollHeight || 0,
      parseSize(htmlElement.getAttribute('height')),
      parseSize(htmlElement.getAttribute('data-height')),
      parseSize(htmlElement.style.height),
      parseSize(computed.height)
    );

    return { width, height };
  }, [parseSize]);

  // Mount the slot only while no ancestor is display:none AND the reader is within
  // LAZY_MARGIN_PX of it. Once mounted it stays: the SDK owns the node from then on,
  // and removing it would orphan an auction.
  // VOX counts a display impression when the creative loads, but the view only once
  // half of it has been on screen for 1 s. The 970×250 sits ~2700px down an article,
  // so loading it on page open billed impressions nobody saw (test campaign
  // 2026-10-26/27: 19 impressions, 5 views). Bench 2026-10-27: 60% → 100% with the
  // same number of views.
  useEffect(() => {
    if (!active || inLayout) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const isDisplayed = () => {
      let node: HTMLElement | null = sentinel.parentElement;
      if (!node) return false;
      while (node && node !== document.body) {
        if (window.getComputedStyle(node).display === 'none') return false;
        node = node.parentElement;
      }
      return true;
    };
    if (typeof window.IntersectionObserver === 'undefined') {
      const check = () => { if (isDisplayed()) setInLayout(true); };
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }
    // A sentinel under a display:none wrapper has no box and never intersects, so
    // this also covers the breakpoint gate (it fires when the wrapper appears).
    const observer = new window.IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && isDisplayed()) setInLayout(true);
    }, { rootMargin: `${LAZY_MARGIN_PX}px 0px` });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, inLayout]);

  // All hooks are above this early return — Rules of Hooks compliant
  useEffect(() => {
    if (!active || !inLayout) return;

    const container = containerRef.current;
    if (!container) return;
    setAdStatus('loading');
    lastUnsuitableReasonRef.current = '';

    const evaluateAd = () => {
      const hasContent = (
        container.children.length > 0 ||
        container.querySelector('iframe') !== null ||
        container.innerHTML.trim() !== ''
      );

      if (!hasContent) {
        setAdStatus(container.dataset.hybSspAdPlaceStatus === 'empty' ? 'empty' : 'loading');
        return;
      }

      // A creative can ship tracking iframes before the actual banner. Measuring
      // only the first iframe hid the whole slot when that iframe was 1×1.
      const candidates = [
        ...Array.from(container.querySelectorAll('iframe, img, video')),
        ...Array.from(container.children),
      ].map(resolveElementSize);
      const measured = candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
      if (!measured) {
        setAdStatus('loading');
        return;
      }

      if (measured.width <= 0 || measured.height <= 0) {
        setAdStatus('loading');
        return;
      }

      // v10.20.12: relaxed size-gate. The old bands (W 0.65–1.1×, H 0.7–1.35×)
      // hid legitimate DSP creatives that come in adjacent sizes (a 300×250 slot
      // can be filled by a 336×280, a 728×90 by a 750×100, etc.). Now we only hide
      // DEGENERATE creatives (tracking pixels / collapsed) — anything with real,
      // non-absurd dimensions renders. This is the intended "show whatever fills".
      const MIN_W = 40;   // below this = tracking pixel / not a real banner
      const MIN_H = 20;
      const widthOk = measured.width >= Math.max(MIN_W, expectedWidth * 0.4) && measured.width <= expectedWidth * 2;
      const heightOk = measured.height >= Math.max(MIN_H, expectedHeight * 0.4) && measured.height <= expectedHeight * 2.5;

      if (widthOk && heightOk) {
        setAdStatus('ready');
        return;
      }

      // Only truly degenerate sizes get hidden.
      const degenerate = measured.width < MIN_W || measured.height < MIN_H;
      if (!degenerate) {
        // Real creative, just an unusual size — show it rather than leave a blank slot.
        setAdStatus('ready');
        return;
      }

      const reason = `expected~${expectedWidth}x${expectedHeight}, got~${Math.round(measured.width)}x${Math.round(measured.height)}`;
      setAdStatus('unsuitable');

      if (lastUnsuitableReasonRef.current !== reason) {
        lastUnsuitableReasonRef.current = reason;
        console.log(`[VOX] Hiding degenerate ad ${placeId} (${format}): ${reason}`);
      }
    };

    const debouncedEvaluate = () => {
      if (evaluateDebounceRef.current) clearTimeout(evaluateDebounceRef.current);
      evaluateDebounceRef.current = setTimeout(evaluateAd, 150);
    };

    const timers = [2500, 5000, 8000, 12000].map((delay) =>
      window.setTimeout(evaluateAd, delay)
    );

    const observer = new MutationObserver((mutations) => {
      // Filter out attribute changes on the container itself (caused by React re-rendering data-ad-status)
      const hasRelevantMutation = mutations.some((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === container &&
            mutation.attributeName !== 'data-hyb-ssp-ad-place-status') {
          return false; // Ignore self-attribute changes to prevent feedback loop
        }
        return (
          (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) ||
          mutation.type === 'attributes'
        );
      });

      if (hasRelevantMutation) {
        debouncedEvaluate();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'width', 'height', 'src', 'data-hyb-ssp-ad-place-status'],
    });

    evaluateAd();

    return () => {
      observer.disconnect();
      timers.forEach((timerId) => window.clearTimeout(timerId));
      if (evaluateDebounceRef.current) clearTimeout(evaluateDebounceRef.current);
    };
  }, [active, inLayout, expectedHeight, expectedWidth, format, placeId, resolveElementSize]);

  // Early return after all hooks
  if (!active) return null;
  if (!inLayout) {
    return <span ref={sentinelRef} aria-hidden="true" data-vox-slot-pending={format} style={{ display: 'block', width: 0, height: 0 }} />;
  }

  const isAdLoaded = adStatus === 'ready';

  return (
    <div
      ref={containerRef}
      data-hyb-ssp-ad-place={placeId}
      data-ad-format={format}
      data-ad-placement={placement}
      data-ad-status={adStatus}
      className={`vox-ad-container vox-${placement}-ad ${className}`.trim()}
      style={{
        opacity: isAdLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: formatMaxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        overflow: 'visible',
        background: 'transparent',
        minHeight: isAdLoaded ? dimensions.height : '0',
        maxHeight: isAdLoaded ? 'none' : '0',
      }}
    />
  );
}

export type { UniversalAdProps };
