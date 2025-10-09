interface InlineAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  // Адаптивные размеры с ограничениями:
  // 728x90 (Leaderboard) - после заголовка
  // 970x250 (Large Leaderboard) - конец статьи
  const maxWidth = format === "728x90" ? "728px" : format === "970x250" ? "970px" : "728px";
  const minHeight = format === "728x90" ? "90px" : format === "970x250" ? "250px" : "90px";
  
  return (
    <div 
      className={`my-6 ${className} vox-ad-container`}
      data-hyb-ssp-ad-place={placeId}
      style={{
        width: "100%",
        maxWidth: maxWidth,
        minHeight: minHeight,
        margin: "0 auto",
        opacity: 0,
        transition: "opacity 0.3s ease-in-out"
      }}
    >
      {/* Контейнер будет заполнен VOX рекламой */}
    </div>
  );
}
