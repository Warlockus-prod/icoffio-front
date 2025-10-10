interface SidebarAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function SidebarAd({ placeId, format, className = "" }: SidebarAdProps) {
  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-ad-container ${className}`}
      style={{
        width: '100%',
        margin: '0 auto 24px auto',
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        textAlign: 'center' as const
      }}
    >
      {/* {format} Sidebar Ad Container - VOX заполнит контентом */}
    </div>
  );
}