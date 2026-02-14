/**
 * UniversalAd - Универсальный компонент для всех типов VOX рекламы
 * Поддерживает Desktop, Mobile и Display форматы
 * 
 * ВАЖНО: Компонент скрывается если реклама не загружена (no placeholder/no black spaces)
 * 
 * @version 7.26.0
 * @date 2025-12-04
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
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Если реклама отключена через конфиг, не рендерим
  if (!enabled) {
    return null;
  }

  const dimensions = AD_DIMENSIONS[format];

  // Наблюдаем за контейнером чтобы определить загрузилась ли реклама
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Таймаут для проверки загрузки рекламы
    const timeout = setTimeout(() => {
      if (container) {
        const hasContent = container.children.length > 0 ||
          container.innerHTML.trim() !== '' ||
          container.querySelector('iframe') !== null;

        if (hasContent) {
          setIsAdLoaded(true);
        } else {
          // Нет контента после таймаута - скрываем плейсмент
          setHasError(true);
          console.log(`VOX: No ad content for ${format} (${placeId}) - hiding placeholder`);
        }
      }
    }, 4000); // 4 секунды на загрузку рекламы

    // MutationObserver для отслеживания когда VOX добавит контент
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          setIsAdLoaded(true);
          clearTimeout(timeout);
        }
      });
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [format, placeId]);

  // Если ошибка загрузки - не показываем ничего
  if (hasError) {
    return null;
  }

  // Определяем стили в зависимости от типа размещения
  const getStyles = (): React.CSSProperties => {
    // Базовые стили - контейнер скрыт пока реклама не загружена
    const baseStyle: React.CSSProperties = {
      opacity: isAdLoaded ? 1 : 0,
      transition: 'opacity 0.3s ease-in-out',
      backgroundColor: 'transparent',
      border: 'none',
      overflow: 'visible',
    };

    // Common styles for all placements
    const commonStyle: React.CSSProperties = {
      ...baseStyle,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 'auto',
      marginRight: 'auto',
      maxWidth: '100%', // Prevent overflow
    };

    switch (placement) {
      case 'sidebar':
        return {
          ...commonStyle,
          width: '100%',
          minHeight: isAdLoaded ? (dimensions?.height || '250px') : '0', // Preserve space if loaded
          margin: isAdLoaded ? '0 0 24px 0' : '0',
          maxHeight: isAdLoaded ? 'none' : '0',
        };

      case 'mobile':
        return {
          ...commonStyle,
          width: '100%',
          minHeight: isAdLoaded ? (dimensions?.height || '50px') : '0',
          margin: isAdLoaded ? '16px auto' : '0 auto',
          maxHeight: isAdLoaded ? 'none' : '0',
        };

      case 'display':
        return {
          ...commonStyle,
          width: '100%',
          minHeight: isAdLoaded ? (dimensions?.height || '250px') : '0',
          margin: isAdLoaded ? '16px auto' : '0 auto',
          maxHeight: isAdLoaded ? 'none' : '0',
        };

      default: // inline (728x90, 970x250)
        return {
          ...commonStyle,
          width: '100%',
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
    >
      {/* VOX заполнит контентом автоматически */}
    </div>
  );
}

// Экспорт типов для использования в других компонентах
export type { UniversalAdProps };
