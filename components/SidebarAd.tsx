interface SidebarAdProps {
  placeId: string;
  format: string;
  position?: string;
  className?: string;
}

export function SidebarAd({ placeId, format, position, className = "" }: SidebarAdProps) {
  // Адаптивные размеры для сайдбара:
  // 300x250 (Medium Rectangle) - сайдбар верх
  // 300x600 (Large Skyscraper) - сайдбар низ
  const minHeight = format === "300x600" ? "600px" : format === "300x250" ? "250px" : "250px";
  
  return (
    <div className={`mb-6 ${className}`}>
      <div 
        className="vox-ad-container"
        data-hyb-ssp-ad-place={placeId}
      style={{
        width: "100%",
        maxWidth: "300px",
        minHeight: minHeight,
        margin: "0 auto",
        opacity: 0,
        transition: "opacity 0.3s ease-in-out"
      }}
      >
        {/* Контейнер будет заполнен VOX рекламой */}
      </div>
    </div>
  );
}
