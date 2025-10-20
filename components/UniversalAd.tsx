interface UniversalAdProps {
  placeId: string;
  format?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UniversalAd({ placeId, format = "auto", className = "", style = {} }: UniversalAdProps) {
  return (
    <div 
      data-hyb-ssp-ad-place={placeId}
      className={`vox-universal-ad ${className}`}
      style={{
        display: 'block',
        margin: '20px auto',
        textAlign: 'center' as const,
        backgroundColor: 'transparent',
        border: 'none',
        overflow: 'visible',
        ...style
      }}
    >
      {/* {format} Universal Ad Container - VOX заполнит контентом */}
    </div>
  );
}
