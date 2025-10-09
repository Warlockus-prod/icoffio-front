interface SidebarAdProps {
  placeId: string;
  format: string;
  position?: string;
  className?: string;
}

export function SidebarAd({ placeId, format, position, className = "" }: SidebarAdProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div 
        className="vox-ad-container"
        data-hyb-ssp-ad-place={placeId}
      style={{
        width: "300px",
        maxWidth: "300px",
        opacity: 0,
        transition: "opacity 0.3s ease-in-out",
        height: "auto"
      }}
      >
        {/* Контейнер будет заполнен VOX рекламой */}
      </div>
    </div>
  );
}
