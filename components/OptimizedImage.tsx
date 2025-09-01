'use client'

import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes = '100vw',
  quality = 75,
  placeholder = 'blur',
  blurDataURL
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer для lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Начинаем загрузку за 50px до попадания в область видимости
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Функция для оптимизации URL изображений
  const optimizeImageUrl = (url: string, width?: number, quality = 75): string => {
    // Для Unsplash изображений
    if (url.includes('unsplash.com')) {
      const baseUrl = url.split('?')[0];
      const params = new URLSearchParams();
      
      if (width) params.set('w', width.toString());
      params.set('q', quality.toString());
      params.set('auto', 'format');
      params.set('fit', 'crop');
      
      return `${baseUrl}?${params.toString()}`;
    }

    // Для внутренних изображений - можно добавить логику для Next.js Image Optimization
    if (url.startsWith('/') || url.includes(process.env.NEXT_PUBLIC_SITE_URL || '')) {
      return url; // Next.js сам оптимизирует
    }

    return url;
  };

  // WebP fallback логика
  const getWebPUrl = (url: string): string => {
    if (url.includes('unsplash.com')) {
      return optimizeImageUrl(url, width, quality) + '&fm=webp';
    }
    return url;
  };

  // Проверка поддержки WebP
  const supportsWebP = () => {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Генерация blur placeholder
  const generateBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    
    // Создаем простой blur placeholder
    const svg = `
      <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="225" fill="url(#grad)" />
      </svg>
    `;
    
    // Используем btoa для кодирования в base64 (browser-compatible)
    return `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(svg) : ''}`;
  };

  // Обновляем src при изменении isInView
  useEffect(() => {
    if (isInView && !isLoaded) {
      const webpUrl = supportsWebP() ? getWebPUrl(src) : optimizeImageUrl(src, width, quality);
      setImageSrc(webpUrl);
    }
  }, [isInView, src, width, quality, isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    // Fallback к оригинальному изображению при ошибке
    setImageSrc(optimizeImageUrl(src, width, quality));
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width: width ? `${width}px` : 'auto', height: height ? `${height}px` : 'auto' }}
    >
      {/* Blur placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <img
          src={generateBlurDataURL()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 filter blur-2xl"
        />
      )}
      
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
      )}
      
      {/* Основное изображение */}
      {isInView && (
        <picture>
          {/* WebP source для поддерживающих браузеров */}
          {src.includes('unsplash.com') && (
            <source 
              srcSet={getWebPUrl(src)}
              type="image/webp"
              sizes={sizes}
            />
          )}
          
          <img
            src={imageSrc}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            sizes={sizes}
            loading={priority ? 'eager' : 'lazy'}
          />
        </picture>
      )}

      {/* Индикатор загрузки */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
