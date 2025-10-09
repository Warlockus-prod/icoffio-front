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
      {position && (
        <p className="text-xs text-gray-500 mb-2 font-medium">
          {position}
        </p>
      )}
      <div 
        className="flex items-center justify-center"
        data-hyb-ssp-ad-place={placeId}
        style={{
          width: "300px",
          height: height,
          border: "1px dashed #e5e7eb",
          backgroundColor: "#f9fafb",
          borderRadius: "8px"
        }}
      >
        <span className="text-xs text-gray-500 text-center">
          Ad {format}<br/>
          {placeId.slice(-8)}
        </span>
      </div>
    </div>
  );
}
