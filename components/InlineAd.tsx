interface InlineAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  return (
    <div 
      className={`my-6 flex items-center justify-center ${className}`}
      data-hyb-ssp-ad-place={placeId}
      style={{
        minHeight: format === "728x90" ? "90px" : format === "970x250" ? "250px" : "90px",
        border: "1px dashed #e5e7eb",
        backgroundColor: "#f9fafb",
        borderRadius: "8px"
      }}
    >
      <span className="text-xs text-gray-500">
        Ad {format} • {placeId.slice(-8)}
      </span>
    </div>
  );
}
