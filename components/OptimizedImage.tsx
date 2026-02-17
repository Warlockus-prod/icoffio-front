'use client';

/**
 * 🖼️ OPTIMIZED IMAGE COMPONENT v8.2.1
 * 
 * Next.js Image с автоматическим blur placeholder
 * - Progressive loading (blur → clear)
 * - Lazy loading по умолчанию
 * - Fallback для CORS ошибок
 * - Автоматическая оптимизация через Next.js
 */

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  blurDataUrl?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Стандартный blur placeholder (серый градиент)
const DEFAULT_BLUR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBRIhMQYTQWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAABAhEhMf/aAAwDAQACEQMRAD8AyLT9Ps7qzgluIEkkZAxYjk5p3+P6f/QsP9pSlSbKdH//2Q==';

// Проверяем, является ли URL внешним (не Vercel Blob)
const isExternalUrl = (url: string): boolean => {
  if (!url) return false;
  return !url.includes('vercel-storage.com') && 
         !url.includes('blob.vercel-storage.com') &&
         !url.startsWith('/');
};

export function OptimizedImage({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  sizes,
  quality = 85,
  blurDataUrl,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Сбрасываем состояние при изменении src
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src);
  }, [src, fallbackSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    onError?.();

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setIsLoaded(false);
      setHasError(false);
      setCurrentSrc(fallbackSrc);
      return;
    }

    setHasError(true);
    // Final fallback: inline SVG placeholder (no external file dependency)
    setCurrentSrc('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOWNhM2FmIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==');
  };

  // Определяем blur placeholder
  const blur = blurDataUrl || DEFAULT_BLUR;

  // Для внешних изображений (Unsplash и т.д.) используем unoptimized
  // чтобы избежать проблем с domains
  const isExternal = isExternalUrl(currentSrc);

  if (fill) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* Blur placeholder background */}
        {!isLoaded && !hasError && (
          <div 
            className="absolute inset-0 bg-cover bg-center animate-pulse"
            style={{ 
              backgroundImage: `url(${blur})`,
              filter: 'blur(20px)',
              transform: 'scale(1.1)'
            }}
          />
        )}
        
        <Image
          src={currentSrc}
          alt={alt}
          fill
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          quality={quality}
          priority={priority}
          className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
          unoptimized={isExternal}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder background */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-cover bg-center animate-pulse"
          style={{ 
            backgroundImage: `url(${blur})`,
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            width: width || '100%',
            height: height || '100%'
          }}
        />
      )}
      
      <Image
        src={currentSrc}
        alt={alt}
        width={width || 800}
        height={height || 450}
        sizes={sizes}
        quality={quality}
        priority={priority}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={isExternal}
      />
    </div>
  );
}

/**
 * Компактная версия для карточек статей
 */
export function ArticleCardImage({
  src,
  alt,
  className = '',
  blurDataUrl
}: {
  src: string;
  alt: string;
  className?: string;
  blurDataUrl?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      className={`aspect-[16/9] ${className}`}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
      quality={80}
      blurDataUrl={blurDataUrl}
    />
  );
}

/**
 * Hero изображение для статей
 */
export function ArticleHeroImage({
  src,
  alt,
  className = '',
  blurDataUrl,
  priority = true
}: {
  src: string;
  alt: string;
  className?: string;
  blurDataUrl?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      className={`aspect-[21/9] ${className}`}
      sizes="100vw"
      quality={90}
      priority={priority}
      blurDataUrl={blurDataUrl}
    />
  );
}

// Default export для совместимости
export default OptimizedImage;
