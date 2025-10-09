interface InlineAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  return (
    <div 
      className={`my-6 ${className} vox-ad-container`}
      data-hyb-ssp-ad-place={placeId}
      style={{
        minHeight: format === "728x90" ? "90px" : format === "970x250" ? "250px" : "90px",
        width: "100%",
        maxWidth: format === "728x90" ? "728px" : format === "970x250" ? "970px" : "728px",
        margin: "0 auto",
        opacity: 0,
        transition: "opacity 0.3s ease-in-out"
      }}
    >
      {/* Контейнер будет заполнен VOX рекламой */}
    </div>
  );
}
