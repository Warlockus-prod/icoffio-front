interface InlineAdProps {
  placeId: string;
  format: '728x90' | '300x250' | '300x600' | '970x250';
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  // Определяем размеры контейнера по формату
  const getDimensions = (format: string) => {
    switch (format) {
      case '728x90':
        return { width: '728px', height: '90px' };
      case '300x250':
        return { width: '300px', height: '250px' };
      case '300x600':
        return { width: '300px', height: '600px' };
      case '970x250':
        return { width: '970px', height: '250px' };
      default:
        return { width: '728px', height: '90px' };
    }
  };

  const dimensions = getDimensions(format);
  
  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-ad-container ${className}`}
      style={{
        width: format === '970x250' || format === '728x90' ? dimensions.width : '100%',
        maxWidth: format === '970x250' || format === '728x90' ? 'none' : dimensions.width,
        minHeight: dimensions.height,
        margin: '20px auto',
        display: 'block',
        backgroundColor: 'transparent',
        border: 'none',
        textAlign: 'center' as const,
        overflow: 'visible'
      }}
    >
      {/* {format} Display Ad Container - VOX заполнит контентом */}
    </div>
  );
}


