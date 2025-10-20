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
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Предотвращаем hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!mounted || !containerRef.current) return;

    // Проверяем через 4 секунды после mount'а, загрузилась ли реклама
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
    }, 4000);

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

    if (containerRef.current) {
      observer.observe(containerRef.current, { 
        childList: true, 
        subtree: true 
      });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      observer.disconnect();
    };
  }, [hideOnEmpty, mounted]);

  // Если компонент еще не смонтирован - показываем placeholder
  if (!mounted) {
    return (
      <div 
        className={`smart-ad-placeholder ${className}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: dimensions.maxWidth,
          margin: '20px auto',
          display: 'block',
          opacity: 0.3,
          ...style
        }}
      />
    );
  }

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
        opacity: hasAd === null ? 0.7 : 1, // Показываем loading состояние
        transition: 'opacity 0.3s ease, height 0.3s ease',
        ...style
      }}
    >
      {/* Если реклама не загрузилась и есть fallback контент */}
      {mounted && hasAd === false && fallbackContent && (
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
      <div className="mb-3">📬</div>
      <h4 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Newsletter icoffio</h4>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">Получай последние новости технологий</p>
      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
        Подписаться
      </button>
    </div>
  ),
  relatedTopics: (
    <div className="text-center">
      <div className="mb-3">🔥</div>
      <h4 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">Популярные темы</h4>
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer transition-colors">AI</span>
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer transition-colors">Tech</span>
        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 cursor-pointer transition-colors">Apple</span>
        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded-full hover:bg-red-200 dark:hover:bg-red-800 cursor-pointer transition-colors">Digital</span>
      </div>
    </div>
  ),
  quickLinks: (
    <div className="text-center">
      <div className="mb-3">⚡</div>
      <h4 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">Быстрые ссылки</h4>
      <div className="space-y-2 text-xs">
        <div className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">📱 Последние новости</div>
        <div className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">🤖 AI & Machine Learning</div>
        <div className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">🍎 Apple & iOS</div>
      </div>
    </div>
  ),
  socialConnect: (
    <div className="text-center">
      <div className="mb-3">🌐</div>
      <h4 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">Следите за нами</h4>
      <div className="flex justify-center gap-2">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
          <span className="text-blue-600 dark:text-blue-300 text-xs">📧</span>
        </div>
        <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors">
          <span className="text-neutral-600 dark:text-neutral-300 text-xs">🔔</span>
        </div>
      </div>
    </div>
  ),
  empty: null // Полностью скрыть блок
};
