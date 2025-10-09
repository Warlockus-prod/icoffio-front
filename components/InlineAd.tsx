interface InlineAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  return (
    <div 
      className={`my-6 ${className}`}
      data-hyb-ssp-ad-place={placeId}
      style={{
        minHeight: format === "728x90" ? "90px" : format === "970x250" ? "250px" : "90px",
        width: "100%",
        maxWidth: format === "728x90" ? "728px" : format === "970x250" ? "970px" : "728px"
      }}
    >
      {/* VOX заменит содержимое этого контейнера */}
    </div>
  );
}
