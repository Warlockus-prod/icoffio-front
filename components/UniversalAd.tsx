interface UniversalAdProps {
  placeId: string;
  format: '320x50' | '320x100' | '320x480' | '160x600';
  className?: string;
  style?: React.CSSProperties;
}

export function UniversalAd({ placeId, format, className = "", style = {} }: UniversalAdProps) {
  // Определяем размеры для разных форматов
  const getDimensions = (format: string) => {
    switch (format) {
      case '320x50':
        return { width: '320px', height: '50px', maxWidth: '100%' };
      case '320x100':
        return { width: '320px', height: '100px', maxWidth: '100%' };
      case '320x480':
        return { width: '320px', height: '480px', maxWidth: '100%' };
      case '160x600':
        return { width: '160px', height: '600px', maxWidth: '160px' };
      default:
        return { width: '320px', height: '50px', maxWidth: '100%' };
    }
  };

  const dimensions = getDimensions(format);
  const isMobile = ['320x50', '320x100', '320x480'].includes(format);

  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-universal-ad ${isMobile ? 'mobile-ad' : 'desktop-ad'} ${className}`}
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
      {/* {format} Ad Container - VOX заполнит контентом */}
    </div>
  );
}