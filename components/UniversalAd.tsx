interface MobileAdProps {
  placeId: string;
  format?: '320x480' | 'mobile';
  className?: string;
  style?: React.CSSProperties;
}

export function UniversalAd({ placeId, format = "320x480", className = "", style = {} }: MobileAdProps) {
  // Определяем размеры для мобильного формата 320x480
  const dimensions = {
    width: '320px',
    height: '480px',
    maxWidth: '100%' // Адаптивность для узких экранов
  };

  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-mobile-ad ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
        margin: '20px auto',
        display: 'block',
        textAlign: 'center' as const,
        backgroundColor: 'transparent',
        border: 'none',
        overflow: 'visible',
        ...style
      }}
    >
      {/* 320x480 Mobile Ad Container - VOX заполнит контентом */}
    </div>
  );
}

// Alias для обратной совместимости
export const MobileAd = UniversalAd;
