interface SidebarAdProps {
  placeId: string;
  format: string;
  position?: string;
  className?: string;
}

export function SidebarAd({ placeId, format, position, className = "" }: SidebarAdProps) {
  const height = format === "300x600" ? "600px" : format === "300x250" ? "250px" : "250px";
  
  return (
    <div className={`mb-6 ${className}`}>
      <div 
        data-hyb-ssp-ad-place={placeId}
        style={{
          width: "300px",
          minHeight: height,
          maxWidth: "100%"
        }}
      >
        {/* VOX заменит содержимое этого контейнера */}
      </div>
    </div>
  );
}
