/**
 * UniversalAd — проверяет соответствие размера креатива ожидаемому формату
 * и скрывает неподходящие баннеры.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

export function UniversalAd({
  placeId,
  format,
  placement = 'inline',
  className = '',
  enabled = true
}: UniversalAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adStatus, setAdStatus] = useState<'loading' | 'ready' | 'unsuitable'>('loading');
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

  // All hooks are above this early return — Rules of Hooks compliant
  useEffect(() => {
    if (!enabled) return;

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
        setAdStatus('loading');
        return;
      }

      const creative = container.querySelector('iframe') || container.firstElementChild;
      if (!creative) {
        setAdStatus('loading');
        return;
      }

      const measured = resolveElementSize(creative);
      if (measured.width <= 0 || measured.height <= 0) {
        setAdStatus('loading');
        return;
      }

      // Разрешаем масштабирование, но не пропускаем явный mismatch.
      const widthMin = expectedWidth * 0.65;
      const widthMax = expectedWidth * 1.1;
      const heightMin = expectedHeight * 0.7;
      const heightMax = expectedHeight * 1.35;

      const widthOk = measured.width >= widthMin && measured.width <= widthMax;
      const heightOk = measured.height >= heightMin && measured.height <= heightMax;

      if (widthOk && heightOk) {
        setAdStatus('ready');
        return;
      }

      const reason = `expected~${expectedWidth}x${expectedHeight}, got~${Math.round(measured.width)}x${Math.round(measured.height)}`;
      setAdStatus('unsuitable');

      if (lastUnsuitableReasonRef.current !== reason) {
        lastUnsuitableReasonRef.current = reason;
        console.log(`[VOX] Hiding unsuitable ad ${placeId} (${format}): ${reason}`);
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
        if (mutation.type === 'attributes' && mutation.target === container) {
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
      attributeFilter: ['style', 'class', 'width', 'height', 'src'], // Only relevant attributes, NOT data-ad-status
    });

    evaluateAd();

    return () => {
      observer.disconnect();
      timers.forEach((timerId) => window.clearTimeout(timerId));
      if (evaluateDebounceRef.current) clearTimeout(evaluateDebounceRef.current);
    };
  }, [enabled, expectedHeight, expectedWidth, format, placeId, resolveElementSize]);

  // Early return after all hooks
  if (!enabled) return null;

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
