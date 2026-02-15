/**
 * UniversalAd - Универсальный компонент для всех типов VOX рекламы
 * Поддерживает Desktop, Mobile и Display форматы
 * 
 * ВАЖНО: Компонент скрывается если реклама не загружена (no placeholder/no black spaces)
 * 
 * @version 8.6.1
 * @date 2026-02-14
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export type AdFormat =
  // Desktop Inline
  | '728x90'    // Leaderboard
  | '970x250'   // Large Leaderboard
  // Sidebar
  | '300x250'   // Medium Rectangle
  | '300x600'   // Large Skyscraper
  // Mobile
  | '320x50'    // Mobile Banner
  | '320x100'   // Large Mobile Banner
  | '160x600'   // Wide Skyscraper
  // Display
  | '320x480'   // Mobile Interstitial
  // Video
  | 'video';    // Video Advertising

export type AdPlacement = 'inline' | 'sidebar' | 'mobile' | 'display' | 'video';

interface UniversalAdProps {
  placeId: string;
  format: AdFormat;
  placement?: AdPlacement;
  className?: string;
  enabled?: boolean;
}

const AD_DIMENSIONS: Partial<Record<AdFormat, { width: string; height: string }>> = {
  '728x90': { width: '728px', height: '90px' },
  '970x250': { width: '970px', height: '250px' },
  '300x250': { width: '300px', height: '250px' },
  '300x600': { width: '300px', height: '600px' },
  '320x50': { width: '320px', height: '50px' },
  '320x100': { width: '320px', height: '100px' },
  '160x600': { width: '160px', height: '600px' },
  '320x480': { width: '320px', height: '480px' },
  'video': { width: '640px', height: '360px' },
};

export function UniversalAd({
  placeId,
  format,
  placement = 'inline',
  className = "",
  enabled = true
}: UniversalAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adStatus, setAdStatus] = useState<'loading' | 'ready' | 'unsuitable'>('loading');
  const lastUnsuitableReasonRef = useRef<string>('');

  // Если реклама отключена через конфиг, не рендерим
  if (!enabled) {
    return null;
  }

  const dimensions = AD_DIMENSIONS[format];
  const formatMaxWidth = dimensions?.width || '100%';
  const expectedWidth = dimensions ? Number.parseInt(dimensions.width, 10) : null;
  const expectedHeight = dimensions ? Number.parseInt(dimensions.height, 10) : null;

  const parseSize = (value: string | null | undefined): number => {
    if (!value) return 0;
    const normalized = value.replace('px', '').trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolveElementSize = (element: Element): { width: number; height: number } => {
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
      parseSize(computed.width),
    );

    const height = Math.max(
      rect.height,
      htmlElement.clientHeight || 0,
      htmlElement.scrollHeight || 0,
      parseSize(htmlElement.getAttribute('height')),
      parseSize(htmlElement.getAttribute('data-height')),
      parseSize(htmlElement.style.height),
      parseSize(computed.height),
    );

    return { width, height };
  };

  const checkSuitability = (container: HTMLDivElement): { status: 'loading' | 'ready' | 'unsuitable'; reason?: string } => {
    const hasContent = (
      container.children.length > 0 ||
      container.querySelector('iframe') !== null ||
      container.innerHTML.trim() !== ''
    );

    if (!hasContent) {
      return { status: 'loading' };
    }

    if (!expectedWidth || !expectedHeight || format === 'video') {
      return { status: 'ready' };
    }

    const creative = container.querySelector('iframe') || container.firstElementChild;
    if (!creative) {
      return { status: 'loading' };
    }

    const measured = resolveElementSize(creative);
    if (measured.width <= 0 || measured.height <= 0) {
      return { status: 'loading' };
    }

    // Допускаем умеренное масштабирование, но блокируем явно неподходящие креативы.
    const widthMin = expectedWidth * 0.65;
    const widthMax = expectedWidth * 1.1;
    const heightMin = expectedHeight * 0.7;
    const heightMax = expectedHeight * 1.35;

    const widthOk = measured.width >= widthMin && measured.width <= widthMax;
    const heightOk = measured.height >= heightMin && measured.height <= heightMax;

    if (widthOk && heightOk) {
      return { status: 'ready' };
    }

    return {
      status: 'unsuitable',
      reason: `expected~${expectedWidth}x${expectedHeight}, got~${Math.round(measured.width)}x${Math.round(measured.height)}`,
    };
  };

  // Наблюдаем за контейнером и не удаляем его, чтобы реклама могла догрузиться позже.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setAdStatus('loading');
    lastUnsuitableReasonRef.current = '';

    const evaluateAd = () => {
      const result = checkSuitability(container);
      setAdStatus(result.status);

      if (result.status === 'unsuitable' && result.reason && lastUnsuitableReasonRef.current !== result.reason) {
        lastUnsuitableReasonRef.current = result.reason;
        console.log(`[VOX] Hiding unsuitable ad ${placeId} (${format}): ${result.reason}`);
      }
    };

    // Проверки с интервалами покрывают медленные ответы ad-provider.
    const timers = [2500, 5000, 8000, 12000].map((delay) =>
      window.setTimeout(evaluateAd, delay)
    );

    // MutationObserver для отслеживания момента, когда VOX добавит контент.
    const observer = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some((mutation) => (
        (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) ||
        mutation.type === 'attributes'
      ));

      if (hasRelevantMutation) {
        evaluateAd();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Быстрая проверка на случай уже загруженного кэша.
    evaluateAd();

    return () => {
      observer.disconnect();
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [expectedHeight, expectedWidth, format, placeId]);

  const isAdLoaded = adStatus === 'ready';

  // Определяем стили в зависимости от типа размещения
  const getStyles = (): React.CSSProperties => {
    // Базовые стили - контейнер скрыт пока реклама не загружена
    const baseStyle: React.CSSProperties = {
      opacity: isAdLoaded ? 1 : 0,
      transition: 'opacity 0.3s ease-in-out',
      backgroundColor: 'transparent',
      border: 'none',
      overflow: 'visible',
      boxSizing: 'border-box',
    };

    // Common styles for all placements
    const commonStyle: React.CSSProperties = {
      ...baseStyle,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 'auto',
      marginRight: 'auto',
      width: '100%',
      maxWidth: formatMaxWidth,
    };

    switch (placement) {
      case 'sidebar':
        return {
          ...commonStyle,
          minHeight: isAdLoaded ? (dimensions?.height || '250px') : '0', // Preserve space if loaded
          margin: isAdLoaded ? '0 0 24px 0' : '0',
          maxHeight: isAdLoaded ? 'none' : '0',
        };

      case 'mobile':
        return {
          ...commonStyle,
          minHeight: isAdLoaded ? (dimensions?.height || '50px') : '0',
          margin: isAdLoaded ? '16px auto' : '0 auto',
          maxHeight: isAdLoaded ? 'none' : '0',
        };

      case 'display':
        return {
          ...commonStyle,
          minHeight: isAdLoaded ? (dimensions?.height || '250px') : '0',
          margin: isAdLoaded ? '16px auto' : '0 auto',
          maxHeight: isAdLoaded ? 'none' : '0',
        };

      default: // inline (728x90, 970x250)
        return {
          ...commonStyle,
          // Use minHeight to avoid layout shift if dimensions known, but allow expansion
          minHeight: isAdLoaded ? (dimensions?.height || '90px') : '0',
          margin: isAdLoaded ? '20px auto' : '0 auto',
          maxHeight: isAdLoaded ? 'none' : '0',
        };
    }
  };

  // Определяем CSS класс
  const getCssClass = () => {
    const base = 'vox-ad-container';
    const typeClass = `vox-${placement}-ad`;
    const formatClass = `vox-${format.replace('x', '-')}`;
    const loadedClass = isAdLoaded ? 'vox-ad-loaded' : 'vox-ad-loading';
    return `${base} ${typeClass} ${formatClass} ${loadedClass} ${className}`.trim();
  };

  return (
    <div
      ref={containerRef}
      data-hyb-ssp-ad-place={placeId}
      className={getCssClass()}
      style={getStyles()}
      data-ad-format={format}
      data-ad-placement={placement}
      data-ad-status={adStatus}
    >
      {/* VOX заполнит контентом автоматически */}
    </div>
  );
}

// Экспорт типов для использования в других компонентах
export type { UniversalAdProps };
