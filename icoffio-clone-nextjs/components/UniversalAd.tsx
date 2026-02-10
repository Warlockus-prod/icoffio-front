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
  
  // Если реклама отключена через конфиг, не рендерим
  if (!enabled) {
    return null;
  }

  const dimensions = AD_DIMENSIONS[format];

  // Наблюдаем за контейнером чтобы определить загрузилась ли реклама
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // MutationObserver для отслеживания когда VOX добавит контент
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          setIsAdLoaded(true);
        }
      });
    });

    observer.observe(container, { childList: true, subtree: true });

    // Периодическая проверка — VOX может заполнить контейнер через innerHTML
    // а не через appendChild, что MutationObserver не всегда отловит
    const checkInterval = setInterval(() => {
      if (container) {
        const hasContent = container.children.length > 0 || 
                          container.innerHTML.trim() !== '' ||
                          container.querySelector('iframe') !== null;
        if (hasContent) {
          setIsAdLoaded(true);
          clearInterval(checkInterval);
        }
      }
    }, 1000);

    // Через 30 секунд прекращаем проверку (но НЕ удаляем контейнер из DOM!)
    const cleanupTimeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);

    return () => {
      observer.disconnect();
      clearInterval(checkInterval);
      clearTimeout(cleanupTimeout);
    };
  }, [format, placeId]);

  // ВАЖНО: Контейнер ВСЕГДА остаётся в DOM — VOX должен его найти!
  // Если реклама не загружена — контейнер невидим и не занимает места
  
  // Определяем стили в зависимости от типа размещения
  const getStyles = (): React.CSSProperties => {
    if (!isAdLoaded) {
      // Контейнер в DOM, но невидим и не занимает места
      return {
        display: 'block',
        opacity: 0,
        maxHeight: 0,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        border: 'none',
        backgroundColor: 'transparent',
      };
    }

    // Реклама загружена — показываем с анимацией
    const baseStyle: React.CSSProperties = {
      opacity: 1,
      transition: 'opacity 0.3s ease-in-out',
      backgroundColor: 'transparent',
      border: 'none',
      overflow: 'visible',
    };

    switch (placement) {
      case 'sidebar':
        return {
          ...baseStyle,
          width: '100%',
          margin: '0 0 24px 0',
          display: 'block',
        };
      
      case 'mobile':
        return {
          ...baseStyle,
          width: dimensions?.width || 'auto',
          margin: '16px auto',
          display: 'block',
        };
      
      case 'display':
        return {
          ...baseStyle,
          width: '100%',
          maxWidth: dimensions?.width || 'auto',
          margin: '16px auto',
          display: 'block',
          textAlign: 'center',
        };
      
      default: // inline (728x90, 970x250)
        return {
          ...baseStyle,
          width: '100%',
          maxWidth: dimensions?.width || 'auto',
          margin: '20px auto',
          display: 'block',
          textAlign: 'center',
        };
    }
  };

  return (
    <div 
      ref={containerRef}
      data-hyb-ssp-ad-place={placeId}
      className={`vox-ad-container ${className}`.trim()}
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
