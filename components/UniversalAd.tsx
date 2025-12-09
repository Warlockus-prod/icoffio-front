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

// ✅ v8.7.6: Lazy loading support
const useIntersectionObserver = (
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      rootMargin: '50px', // Start loading 50px before visible
      threshold: 0.1,
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
};

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
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  
  // ✅ v8.7.6: Lazy loading - используем placeholder для Intersection Observer
  const isVisible = useIntersectionObserver(placeholderRef, {
    rootMargin: '100px', // Начинаем загрузку за 100px до появления
  });

  useEffect(() => {
    if (isVisible && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isVisible, shouldLoad]);
  
  // Если реклама отключена через конфиг, не рендерим
  if (!enabled) {
    return null;
  }

  const dimensions = AD_DIMENSIONS[format];

  // ✅ v8.7.6: Наблюдаем за контейнером только если нужно загружать (lazy loading)
  useEffect(() => {
    if (!shouldLoad) return; // Не загружаем пока не видно
    
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
  }, [format, placeId, shouldLoad]);

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

    switch (placement) {
      case 'sidebar':
        return {
          ...baseStyle,
          width: '100%',
          margin: isAdLoaded ? '0 0 24px 0' : '0',
          display: 'block',
          // Высота 0 пока реклама не загружена
          maxHeight: isAdLoaded ? 'none' : '0',
        };
      
      case 'mobile':
        return {
          ...baseStyle,
          width: dimensions?.width || 'auto',
          margin: isAdLoaded ? '16px auto' : '0 auto',
          display: 'block',
          maxHeight: isAdLoaded ? 'none' : '0',
        };
      
      case 'display':
        return {
          ...baseStyle,
          width: '100%',
          maxWidth: dimensions?.width || 'auto',
          margin: isAdLoaded ? '16px auto' : '0 auto',
          display: 'block',
          textAlign: 'center',
          maxHeight: isAdLoaded ? 'none' : '0',
        };
      
      default: // inline (728x90, 970x250)
        // ✅ v8.7.6: Убираем maxWidth для широких баннеров чтобы не обрезались
        const isWideBanner = format === '728x90' || format === '970x250';
        return {
          ...baseStyle,
          width: isWideBanner ? dimensions?.width || '100%' : '100%',
          maxWidth: isWideBanner ? 'none' : (dimensions?.width || 'auto'), // Не ограничиваем широкие баннеры
          margin: isAdLoaded ? '20px auto' : '0 auto',
          display: 'block',
          textAlign: 'center',
          maxHeight: isAdLoaded ? 'none' : '0',
          overflow: 'visible', // ✅ v8.7.6: Убираем обрезание
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

  // ✅ v8.7.6: Lazy loading - показываем placeholder пока не видно
  if (!shouldLoad) {
    return (
      <div 
        ref={placeholderRef}
        style={{ 
          minHeight: dimensions?.height || '50px', // Минимальная высота для Intersection Observer
          width: '100%',
        }}
        data-lazy-ad-placeholder={placeId}
        data-ad-format={format}
      />
    );
  }

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
