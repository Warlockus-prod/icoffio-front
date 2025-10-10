interface InlineAdProps {
  placeId: string;
  format: string;
  className?: string;
}

export function InlineAd({ placeId, format, className = "" }: InlineAdProps) {
  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-ad-container ${className}`}
      style={{
        width: '100%',
        margin: '20px auto',
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        textAlign: 'center' as const
      }}
    >
      {/* {format} Display Ad Container - VOX заполнит контентом */}
    </div>
  );
}