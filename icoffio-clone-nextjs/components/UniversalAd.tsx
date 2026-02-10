/**
 * UniversalAd — простой контейнер для VOX Display рекламы
 * 
 * Просто рендерит div с data-hyb-ssp-ad-place.
 * VOX SDK сам находит контейнер, заполняет рекламой и показывает.
 * Никакого React state management — никаких таймаутов и удалений из DOM.
 */

'use client';

export type AdFormat = 
  | '728x90' | '970x250'   // Desktop inline
  | '300x250' | '300x600'  // Sidebar
  | '320x50' | '320x100'   // Mobile
  | '160x600' | '320x480'; // Mobile extended

export type AdPlacement = 'inline' | 'sidebar' | 'mobile' | 'display';

interface UniversalAdProps {
  placeId: string;
  format: AdFormat;
  placement?: AdPlacement;
  className?: string;
  enabled?: boolean;
}

export function UniversalAd({ 
  placeId, 
  format, 
  placement = 'inline',
  className = '',
  enabled = true 
}: UniversalAdProps) {
  if (!enabled) return null;

  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      data-ad-format={format}
      data-ad-placement={placement}
      className={className}
      style={{
        display: 'block',
        textAlign: 'center',
        overflow: 'hidden',
        background: 'transparent',
        minHeight: 0,
      }}
    />
  );
}

export type { UniversalAdProps };
