'use client';

/**
 * VIDEO PLAYER WITH ADVERTISING v7.9.0
 * 
 * Профессиональный видео плеер с поддержкой:
 * - Instream реклама (preroll, midroll, postroll)
 * - Outstream реклама (sticky, in-content)
 * - VOX Display интеграция
 * - Responsive дизайн
 * - Analytics трекинг
 * 
 * @version 7.9.0
 * @date 2025-10-30
 */

import { useEffect, useRef, useState } from 'react';

export type VideoPlayerType = 'instream' | 'outstream';
export type VideoPlayerPosition = 
  | 'article-end'      // В конце статьи
  | 'article-middle'   // В середине статьи
  | 'sidebar-sticky'   // Sticky сбоку (desktop)
  | 'in-content';      // Между параграфами (mobile)

interface VideoPlayerProps {
  type: VideoPlayerType;
  position: VideoPlayerPosition;
  videoUrl?: string;              // URL видео для instream
  videoTitle?: string;            // Заголовок видео
  voxPlaceId?: string;            // VOX PlaceID для рекламы
  autoplay?: boolean;             // Автоплей (только для outstream)
  muted?: boolean;                // Muted по умолчанию
  className?: string;
}

export default function VideoPlayer({
  type,
  position,
  videoUrl,
  videoTitle,
  voxPlaceId,
  autoplay = false,
  muted = true,
  className = ''
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAdContent, setHasAdContent] = useState(true); // hide if no content after timeout

  const getElementSize = (element: Element | null): { width: number; height: number } => {
    if (!element) return { width: 0, height: 0 };
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    return {
      width: Math.max(rect.width, htmlElement.clientWidth || 0, htmlElement.scrollWidth || 0),
      height: Math.max(rect.height, htmlElement.clientHeight || 0, htmlElement.scrollHeight || 0),
    };
  };

  const hasRenderableAdContent = (container: HTMLDivElement): boolean => {
    const adEl = container.querySelector('[data-hyb-ssp-ad-place]');
    if (!adEl) return false;

    const creativeCandidates = Array.from(
      adEl.querySelectorAll('iframe, img, video, canvas, object, embed')
    );

    if (creativeCandidates.length === 0) {
      return false;
    }

    return creativeCandidates.some((candidate) => {
      const { width, height } = getElementSize(candidate);
      return width >= 120 && height >= 60;
    });
  };

  // Intersection Observer для autoplay on scroll (outstream)
  useEffect(() => {
    if (type !== 'outstream' || !playerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          
          // Autoplay при появлении в viewport
          if (entry.isIntersecting && autoplay && videoRef.current) {
            videoRef.current.play().catch(() => {
              console.log('[VideoPlayer] Autoplay prevented');
            });
          } else if (!entry.isIntersecting && videoRef.current) {
            videoRef.current.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(playerRef.current);

    return () => observer.disconnect();
  }, [type, autoplay]);

  // VOX ad integration — relies on global SSP loaded by layout.tsx.
  // We keep the container only if a real creative is rendered.
  useEffect(() => {
    if (!voxPlaceId) return;

    const container = playerRef.current;
    if (!container) return;

    // VOX script is loaded globally in layout.tsx, just init the placement.
    function initializeVoxAd() {
      if ((window as any)._tx) {
        (window as any)._tx.cmds = (window as any)._tx.cmds || [];
        (window as any)._tx.cmds.push(() => {
          (window as any)._tx.init();
        });
      }
    }

    initializeVoxAd();

    const evaluate = () => {
      if (videoUrl) {
        setHasAdContent(true);
        return;
      }

      const ready = hasRenderableAdContent(container);
      if (ready) {
        setHasAdContent(true);
      }
    };

    evaluate();

    const observer = new MutationObserver(() => {
      evaluate();
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true });

    // Hard cutoff: if no creative is actually rendered, hide the block.
    const hardTimeout = setTimeout(() => {
      if (videoUrl) return;
      if (!hasRenderableAdContent(container)) {
        setHasAdContent(false);
      }
    }, 3500);

    return () => {
      observer.disconnect();
      clearTimeout(hardTimeout);
    };
  }, [videoUrl, voxPlaceId]);

  // Получить размеры контейнера по типу
  const getContainerDimensions = () => {
    switch (type) {
      case 'instream':
        return {
          width: '100%',
          maxWidth: position === 'article-end' ? '800px' : '100%',
          aspectRatio: '16/9'
        };
      case 'outstream':
        if (position === 'sidebar-sticky') {
          return { width: '300px', height: '250px' };
        }
        return { width: '100%', maxWidth: '640px', aspectRatio: '16/9' };
      default:
        return { width: '100%', aspectRatio: '16/9' };
    }
  };

  const dimensions = getContainerDimensions();

  // Instream блоки без видеофайла не показываем: иначе получаем пустой/зависший placeholder.
  if (type === 'instream' && !videoUrl) {
    return null;
  }

  // If no ad content loaded after timeout — hide entirely.
  if (!videoUrl && !hasAdContent) {
    return null;
  }

  // Sticky стили для sidebar
  const getStickyStyles = () => {
    if (position === 'sidebar-sticky') {
      return {
        position: 'sticky' as const,
        top: '20px',
        maxHeight: 'calc(100vh - 40px)'
      };
    }
    return {};
  };

  return (
    <div
      ref={playerRef}
      className={`video-player-container ${className}`}
      style={{
        ...dimensions,
        ...getStickyStyles(),
        margin: position === 'article-end' ? '40px auto' : '20px 0',
        backgroundColor: videoUrl ? '#000' : 'transparent',
        borderRadius: videoUrl ? '12px' : '0',
        overflow: 'hidden'
      }}
      data-player-type={type}
      data-position={position}
    >
      {/* Instream: Видео с рекламой */}
      {type === 'instream' && (
        <div className="relative w-full h-full">
          {videoUrl ? (
            <>
              {/* HTML5 Video */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                controls
                playsInline
                muted={muted}
                poster={`${videoUrl}/thumbnail.jpg`}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support video playback.
              </video>

              {/* VOX Preroll Ad Container */}
              {voxPlaceId && (
                <div
                  data-hyb-ssp-ad-place={voxPlaceId}
                  className="absolute inset-0 z-10"
                  style={{
                    display: isPlaying ? 'none' : 'block',
                    pointerEvents: 'auto'
                  }}
                />
              )}

              {/* Video Title Overlay */}
              {videoTitle && !isPlaying && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-5">
                  <h3 className="text-white font-semibold text-lg">
                    {videoTitle}
                  </h3>
                </div>
              )}
            </>
          ) : (
            // Нет видео - только реклама
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              {voxPlaceId ? (
                <div
                  data-hyb-ssp-ad-place={voxPlaceId}
                  className="w-full h-full"
                />
              ) : (
                <p className="text-gray-400">Video content not available</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Outstream: Только реклама (autoplay on scroll) */}
      {type === 'outstream' && (
        <div className="relative w-full h-full">
          {voxPlaceId ? (
            <div
              data-hyb-ssp-ad-place={voxPlaceId}
              className="w-full h-full"
            >
              {/* VOX fills content automatically */}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-gray-400 text-sm">Ad placement</p>
            </div>
          )}

          {/* Close button для sticky outstream */}
          {position === 'sidebar-sticky' && (
            <button
              onClick={() => {
                if (playerRef.current) {
                  playerRef.current.style.display = 'none';
                }
              }}
              className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-20"
              aria-label="Close ad"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Утилита: Вставить Outstream плеер в контент статьи
 * Вставляет видео плеер между параграфами (после 40-50% контента)
 */
export function insertOutstreamInContent(
  content: string,
  voxPlaceId: string
): string {
  const paragraphs = content.split('\n\n');
  
  if (paragraphs.length < 4) return content;

  // Вставляем после 40-50% контента
  const insertPosition = Math.floor(paragraphs.length * 0.45);
  
  const outstreamMarker = `\n\n<!-- OUTSTREAM_VIDEO:${voxPlaceId} -->\n\n`;
  
  paragraphs.splice(insertPosition, 0, outstreamMarker);
  
  return paragraphs.join('\n\n');
}
