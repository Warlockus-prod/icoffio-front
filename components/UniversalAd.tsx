/**
 * UniversalAd - Универсальный компонент для всех типов VOX рекламы
 * Поддерживает Desktop, Mobile и Display форматы
 * 
 * @version 7.6.0
 * @date 2025-10-28
 */

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
  enabled?: boolean; // Управление показом через конфиг
}

const AD_DIMENSIONS: Partial<Record<AdFormat, { width: string; height: string }>> = {
  // Desktop Inline
  '728x90': { width: '728px', height: '90px' },
  '970x250': { width: '970px', height: '250px' },
  // Sidebar
  '300x250': { width: '300px', height: '250px' },
  '300x600': { width: '300px', height: '600px' },
  // Mobile
  '320x50': { width: '320px', height: '50px' },
  '320x100': { width: '320px', height: '100px' },
  '160x600': { width: '160px', height: '600px' },
  // Display
  '320x480': { width: '320px', height: '480px' },
  // Video (handled by VideoPlayer component, placeholder dimensions)
  'video': { width: '640px', height: '360px' },
};

export function UniversalAd({ 
  placeId, 
  format, 
  placement = 'inline',
  className = "",
  enabled = true 
}: UniversalAdProps) {
  
  // Если реклама отключена через конфиг, не рендерим
  if (!enabled) {
    return null;
  }

  const dimensions = AD_DIMENSIONS[format];
  
  // Определяем стили в зависимости от типа размещения
  const getStyles = () => {
    const baseStyles = {
      width: '100%',
      maxWidth: dimensions?.width || 'auto',
      minHeight: dimensions?.height || 'auto',
      display: 'block',
      backgroundColor: 'transparent',
      border: 'none',
      overflow: 'visible' as const,
    };

    switch (placement) {
      case 'sidebar':
        return {
          ...baseStyles,
          width: dimensions?.width || '100%',
          height: dimensions?.height || 'auto',
          margin: '0 auto 24px auto',
        };
      
      case 'mobile':
        return {
          ...baseStyles,
          margin: '16px auto',
          maxWidth: '100%',
        };
      
      case 'display':
        return {
          ...baseStyles,
          margin: '20px auto',
          textAlign: 'center' as const,
        };
      
      default: // inline
        return {
          ...baseStyles,
          margin: '20px auto',
          textAlign: 'center' as const,
        };
    }
  };

  // Определяем CSS класс
  const getCssClass = () => {
    const base = 'vox-ad-container';
    const typeClass = `vox-${placement}-ad`;
    const formatClass = `vox-${format.replace('x', '-')}`;
    return `${base} ${typeClass} ${formatClass} ${className}`.trim();
  };

  return (
    <div 
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

