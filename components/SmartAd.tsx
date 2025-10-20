'use client'

import { useState, useEffect, useRef } from 'react';

interface SmartAdProps {
  placeId: string;
  format: '320x50' | '320x100' | '320x480' | '160x600' | '300x250' | '300x600' | '728x90' | '970x250';
  fallbackContent?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hideOnEmpty?: boolean;
}

export function SmartAd({ 
  placeId, 
  format, 
  fallbackContent = null,
  className = "", 
  style = {},
  hideOnEmpty = true 
}: SmartAdProps) {
  const [hasAd, setHasAd] = useState<boolean | null>(null); // null = loading, true = has ad, false = no ad
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Определяем размеры по формату
  const getDimensions = (format: string) => {
    switch (format) {
      case '320x50': return { width: '320px', height: '50px', maxWidth: '100%' };
      case '320x100': return { width: '320px', height: '100px', maxWidth: '100%' };
      case '320x480': return { width: '320px', height: '480px', maxWidth: '100%' };
      case '160x600': return { width: '160px', height: '600px', maxWidth: '160px' };
      case '300x250': return { width: '300px', height: '250px', maxWidth: '300px' };
      case '300x600': return { width: '300px', height: '600px', maxWidth: '300px' };
      case '728x90': return { width: '728px', height: '90px', maxWidth: '100%' };
      case '970x250': return { width: '970px', height: '250px', maxWidth: '100%' };
      default: return { width: '300px', height: '250px', maxWidth: '300px' };
    }
  };

  const dimensions = getDimensions(format);
  const isMobile = ['320x50', '320x100', '320x480'].includes(format);

  useEffect(() => {
    if (!containerRef.current) return;

    // Проверяем через 3 секунды после mount'а, загрузилась ли реклама
    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      // Ищем iframe или другой контент внутри контейнера
      const hasContent = containerRef.current.querySelector('iframe') || 
                        containerRef.current.querySelector('[data-filled]') ||
                        containerRef.current.querySelector('img') ||
                        (containerRef.current.children.length > 0 && 
                         containerRef.current.children[0].tagName !== 'DIV');

      setHasAd(!!hasContent);

      // Если нет рекламы и нужно скрыть - делаем невидимым
      if (!hasContent && hideOnEmpty) {
        setIsVisible(false);
      }
    }, 3000);

    // Дополнительная проверка через наблюдатель за изменениями
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Если добавился iframe или контент - показываем
          const hasContent = containerRef.current?.querySelector('iframe') || 
                            containerRef.current?.querySelector('[data-filled]');
          if (hasContent) {
            setHasAd(true);
            setIsVisible(true);
          }
        }
      });
    });

    observer.observe(containerRef.current, { 
      childList: true, 
      subtree: true 
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      observer.disconnect();
    };
  }, [hideOnEmpty]);

  // Если блок должен быть скрыт - не рендерим вообще
  if (!isVisible && hideOnEmpty) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      data-hyb-ssp-ad-place={placeId}
      className={`smart-ad-container smart-ad-${format} ${isMobile ? 'mobile-ad' : 'desktop-ad'} ${className} ${hasAd === false ? 'ad-empty' : ''} ${hasAd === true ? 'ad-loaded' : ''}`}
      style={{
        width: dimensions.width,
        height: hasAd === false && fallbackContent ? 'auto' : dimensions.height,
        maxWidth: dimensions.maxWidth,
        margin: '20px auto',
        display: 'block',
        textAlign: 'center' as const,
        backgroundColor: 'transparent',
        border: 'none',
        overflow: 'visible',
        opacity: hasAd === null ? 0.5 : 1, // Показываем loading состояние
        transition: 'opacity 0.3s ease, height 0.3s ease',
        ...style
      }}
    >
      {/* Если реклама не загрузилась и есть fallback контент */}
      {hasAd === false && fallbackContent && (
        <div className="fallback-content p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          {fallbackContent}
        </div>
      )}
      
      {/* VOX заполнит этот контейнер, если реклама доступна */}
    </div>
  );
}

// Готовые fallback контенты
export const AdFallbacks = {
  newsletter: (
    <div className="text-center">
      <h4 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">📬 Newsletter</h4>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">Подпишись на обновления</p>
    </div>
  ),
  relatedTopics: (
    <div className="text-center">
      <h4 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">🔥 Популярные темы</h4>
      <div className="flex flex-wrap gap-1 justify-center">
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">AI</span>
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">Tech</span>
        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded">Apple</span>
      </div>
    </div>
  ),
  empty: null // Полностью скрыть блок
};
