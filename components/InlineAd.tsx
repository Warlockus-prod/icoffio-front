interface InlineAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  // Определяем размеры контейнера по формату
  const dimensions = format === '728x90' 
    ? { width: '728px', height: '90px' } 
    : { width: '970px', height: '250px' };
  
  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-ad-container ${className}`}
      style={{
        width: '100%',
        maxWidth: dimensions.width,
        minHeight: dimensions.height,
        margin: '20px auto',
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        textAlign: 'center' as const,
        overflow: 'visible'
      }}
    >
      {/* {format} Display Ad Container - VOX заполнит контентом */}
    </div>
  );
}