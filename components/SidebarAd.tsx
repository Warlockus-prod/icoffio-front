interface SidebarAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function SidebarAd({ placeId, format, className = "" }: SidebarAdProps) {
  // Определяем размеры контейнера по формату
  const dimensions = format === '300x250'
    ? { width: '300px', height: '250px' }
    : { width: '300px', height: '600px' };
  
  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-ad-container ${className}`}
      style={{
        width: '100%',
        minHeight: dimensions.height,
        margin: '0 auto 24px auto',
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        textAlign: 'center' as const,
        overflow: 'visible'
      }}
    >
      {/* {format} Sidebar Ad Container - VOX заполнит контентом */}
    </div>
  );
}