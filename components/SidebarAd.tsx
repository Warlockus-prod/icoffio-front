interface SidebarAdProps {
  placeId: string;
  format: '300x250' | '300x600';
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
      className={`vox-sidebar-ad ${className}`}
      style={{
        width: '100%',
        maxWidth: '320px',
        minHeight: dimensions.height,
        margin: '0 0 20px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        overflow: 'visible'
      }}
    >
      {/* {format} Sidebar Ad Container - VOX заполнит контентом */}
    </div>
  );
}



