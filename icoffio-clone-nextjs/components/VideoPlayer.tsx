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

import { useEffect, useMemo, useRef, useState } from 'react';
import type { VideoPlayerPosition, VideoPlayerType } from '@/lib/config/video-players';

interface VideoPlayerProps {
  type: VideoPlayerType;
  position: VideoPlayerPosition;
  videoUrl?: string;              // URL видео для instream
  videoPlaylist?: string[];       // Последовательность роликов (опционально)
  posterUrl?: string;             // Явный постер (опционально)
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
  videoPlaylist = [],
  posterUrl,
  videoTitle,
  voxPlaceId,
  autoplay = false,
  muted = true,
  className = ''
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const adSlotRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);

  const playlist = useMemo(() => {
    const values = [videoUrl, ...videoPlaylist].filter((item): item is string => Boolean(item && item.trim()));
    return Array.from(new Set(values));
  }, [videoPlaylist, videoUrl]);

  const currentVideo = playlist[playlistIndex];

  useEffect(() => {
    setPlaylistIndex(0);
  }, [playlist]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playlist.length <= 1) return;

    const handleEnded = () => {
      setPlaylistIndex((prev) => (prev + 1) % playlist.length);
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [playlist.length]);

  // Intersection Observer для autoplay on scroll (outstream)
  useEffect(() => {
    if (type !== 'outstream' || !playerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
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

  // Отслеживаем, когда VOX наполнил рекламный контейнер.
  useEffect(() => {
    const slot = adSlotRef.current;
    if (!voxPlaceId || !slot) return;

    const markLoaded = () => {
      const hasPayload = slot.querySelector('iframe') !== null || slot.innerHTML.trim() !== '' || slot.children.length > 0;
      if (hasPayload) {
        setAdLoaded(true);
      }
    };

    setAdLoaded(false);

    const observer = new MutationObserver(() => {
      markLoaded();
    });

    observer.observe(slot, { childList: true, subtree: true, attributes: true });
    const timers = [1200, 2400, 3600, 5200, 7000].map((delay) => window.setTimeout(markLoaded, delay));

    markLoaded();

    return () => {
      observer.disconnect();
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [voxPlaceId]);

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
  const outstreamMinHeight = 'height' in dimensions ? dimensions.height : '250px';

  const resolvedPoster = (() => {
    if (posterUrl) return posterUrl;
    if (!currentVideo) return undefined;
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(currentVideo)) return undefined;
    return `${currentVideo.replace(/\/$/, '')}/thumbnail.jpg`;
  })();

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
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
      data-player-type={type}
      data-position={position}
    >
      {/* Instream: Видео с рекламой */}
      {type === 'instream' && (
        <div className="relative w-full h-full">
          {currentVideo ? (
            <>
              {/* HTML5 Video */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                controls
                playsInline
                muted={muted}
                poster={resolvedPoster}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source src={currentVideo} type="video/mp4" />
                Your browser does not support video playback.
              </video>

              {/* VOX Preroll Ad Container */}
              {voxPlaceId && (
                <div
                  ref={adSlotRef}
                  data-hyb-ssp-ad-place={voxPlaceId}
                  data-ad-placement="video"
                  className="absolute inset-0 z-10"
                  style={{
                    display: isPlaying ? 'none' : 'block',
                    pointerEvents: 'auto'
                  }}
                />
              )}

              {voxPlaceId && !adLoaded && !isPlaying && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-sm pointer-events-none">
                  Loading video advertisement...
                </div>
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
                  ref={adSlotRef}
                  data-hyb-ssp-ad-place={voxPlaceId}
                  data-ad-placement="video"
                  className="w-full h-full"
                />
              ) : (
                <p className="text-gray-400">Video content not available</p>
              )}
              {voxPlaceId && !adLoaded && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-sm pointer-events-none">
                  Loading video advertisement...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Outstream: Только реклама (autoplay on scroll) */}
      {type === 'outstream' && (
        <div className="relative w-full h-full">
          {voxPlaceId ? (
            <>
              <div
                ref={adSlotRef}
                data-hyb-ssp-ad-place={voxPlaceId}
                data-ad-placement="video"
                className="w-full h-full"
                style={{
                  minHeight: outstreamMinHeight,
                  backgroundColor: '#f5f5f5'
                }}
              />
              {!adLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-white/80 pointer-events-none">
                  Loading advertisement...
                </div>
              )}
            </>
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
