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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoPlayerPosition, VideoPlayerType } from '@/lib/config/video-players';

interface VideoPlayerProps {
  type: VideoPlayerType;
  position: VideoPlayerPosition;
  videoUrl?: string;              // URL видео для instream
  videoPlaylist?: string[];       // Последовательность роликов (опционально)
  adTagUrl?: string;              // DSP/VAST ad tag для preroll
  adTagPlaylist?: string[];       // Очередь DSP/VAST ad tag (опционально)
  posterUrl?: string;             // Явный постер (опционально)
  videoTitle?: string;            // Заголовок видео
  voxPlaceId?: string;            // VOX PlaceID для рекламы
  autoplay?: boolean;             // Автоплей (только для outstream)
  muted?: boolean;                // Muted по умолчанию
  className?: string;
}

function isLikelyAdTagUrl(value: string): boolean {
  const url = value.trim().toLowerCase();
  if (!url) return false;

  // DSP/VAST tag endpoints and tracking links must never be treated as content videos.
  return (
    url.includes('ssp.hybrid.ai') ||
    url.includes('dsa-eu.hybrid.ai') ||
    url.includes('/seance/') ||
    url.includes('/deliveryseance/') ||
    url.includes('vast') ||
    url.includes('adtag') ||
    url.includes('ad_tag')
  );
}

const PREROLL_SKIP_DELAY_MS = 5000;
const PREROLL_MAX_WAIT_MS = 30000;

type PrerollStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'completed' | 'failed';

interface PrerollResolveResponse {
  success?: boolean;
  mediaUrl?: string;
  durationSeconds?: number | null;
  error?: string;
}

export default function VideoPlayer({
  type,
  position,
  videoUrl,
  videoPlaylist = [],
  adTagUrl,
  adTagPlaylist = [],
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
  const [hasAdContent, setHasAdContent] = useState(true);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [prerollStatus, setPrerollStatus] = useState<PrerollStatus>('idle');
  const [prerollMediaUrl, setPrerollMediaUrl] = useState<string | null>(null);
  const [prerollDurationSeconds, setPrerollDurationSeconds] = useState<number | null>(null);
  const [prerollError, setPrerollError] = useState<string | null>(null);
  const [showPreroll, setShowPreroll] = useState(false);
  const [prerollNeedsInteraction, setPrerollNeedsInteraction] = useState(false);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));
  const [prerollQueue, setPrerollQueue] = useState<string[]>([]);
  const [prerollQueueIndex, setPrerollQueueIndex] = useState(0);
  const [prerollPlaybackKey, setPrerollPlaybackKey] = useState(0);
  const prerollVideoRef = useRef<HTMLVideoElement>(null);
  const skipTimeoutRef = useRef<number | null>(null);
  const skipCountdownIntervalRef = useRef<number | null>(null);

  const { playlist, blockedAdLikeSources } = useMemo(() => {
    const values = [videoUrl, ...videoPlaylist].filter((item): item is string => Boolean(item && item.trim()));
    const unique = Array.from(new Set(values));

    const blocked: string[] = [];
    const safe = unique.filter((value) => {
      if (isLikelyAdTagUrl(value)) {
        blocked.push(value);
        return false;
      }
      return true;
    });

    return {
      playlist: safe,
      blockedAdLikeSources: blocked,
    };
  }, [videoPlaylist, videoUrl]);

  const currentVideo = playlist[playlistIndex];
  const normalizedAdTagUrls = useMemo(() => {
    const rawValues = [adTagUrl, ...adTagPlaylist]
      .flatMap((value) => (value || '').split(/\r?\n+/))
      .map((value) => value.trim())
      .filter(Boolean);

    const uniqueValues = Array.from(new Set(rawValues));
    const validValues: string[] = [];
    const invalidValues: string[] = [];

    uniqueValues.forEach((value) => {
      if (/^https?:\/\//i.test(value)) {
        validValues.push(value);
      } else {
        invalidValues.push(value);
      }
    });

    if (invalidValues.length > 0) {
      console.warn(
        `[VideoPlayer] Ignored ${invalidValues.length} invalid adTag URL(s). ` +
          'Every adTag must be an absolute http/https URL.'
      );
    }

    return validValues;
  }, [adTagPlaylist, adTagUrl]);

  const shouldResolvePreroll = type === 'instream' && normalizedAdTagUrls.length > 0;
  const shouldUseVoxInstreamOverlay =
    type === 'instream' && Boolean(voxPlaceId) && (!shouldResolvePreroll || prerollStatus === 'failed');
  const hasInstreamRenderableContent = Boolean(currentVideo || shouldResolvePreroll || shouldUseVoxInstreamOverlay);

  useEffect(() => {
    if (blockedAdLikeSources.length === 0) return;
    console.warn(
      `[VideoPlayer] Blocked ${blockedAdLikeSources.length} ad-tag source(s) in instream videoUrl/videoPlaylist. ` +
      'Use DSP/VAST URLs only as ad tags, not as content video URLs.'
    );
  }, [blockedAdLikeSources]);

  const getElementSize = (element: Element | null): { width: number; height: number } => {
    if (!element) return { width: 0, height: 0 };
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    return {
      width: Math.max(rect.width, htmlElement.clientWidth || 0, htmlElement.scrollWidth || 0),
      height: Math.max(rect.height, htmlElement.clientHeight || 0, htmlElement.scrollHeight || 0),
    };
  };

  const hasRenderableAdContent = (slot: HTMLElement): boolean => {
    const candidates = Array.from(
      slot.querySelectorAll('iframe, img, video, canvas, object, embed')
    );

    if (candidates.length === 0) return false;

    return candidates.some((candidate) => {
      const { width, height } = getElementSize(candidate);
      return width >= 120 && height >= 60;
    });
  };

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

  const clearPrerollTimers = useCallback(() => {
    if (skipTimeoutRef.current !== null) {
      window.clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }
    if (skipCountdownIntervalRef.current !== null) {
      window.clearInterval(skipCountdownIntervalRef.current);
      skipCountdownIntervalRef.current = null;
    }
  }, []);

  const completePreroll = useCallback((status: 'completed' | 'failed') => {
    clearPrerollTimers();
    setSkipAvailable(false);
    setSkipCountdown(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));

    if (prerollVideoRef.current) {
      prerollVideoRef.current.pause();
    }

    const shouldLoopAdsOnly = status === 'completed' && !currentVideo && prerollQueue.length > 0;
    if (shouldLoopAdsOnly) {
      const nextIndex = (prerollQueueIndex + 1) % prerollQueue.length;
      const nextMediaUrl = prerollQueue[nextIndex] || prerollQueue[0];

      setPrerollQueueIndex(nextIndex);
      setPrerollMediaUrl(nextMediaUrl);
      setPrerollDurationSeconds(null);
      setPrerollError(null);
      setPrerollNeedsInteraction(false);
      setShowPreroll(true);
      setPrerollStatus('ready');
      setPrerollPlaybackKey((prev) => prev + 1);
      return;
    }

    setShowPreroll(false);
    setPrerollNeedsInteraction(false);
    setPrerollStatus(status);

    if (status === 'completed' && currentVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked by browser policy.
      });
    }
  }, [clearPrerollTimers, currentVideo, prerollQueue, prerollQueueIndex]);

  const armSkipCountdown = useCallback(() => {
    clearPrerollTimers();
    setSkipAvailable(false);
    setSkipCountdown(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));

    skipTimeoutRef.current = window.setTimeout(() => {
      setSkipAvailable(true);
      setSkipCountdown(0);
    }, PREROLL_SKIP_DELAY_MS);

    skipCountdownIntervalRef.current = window.setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          if (skipCountdownIntervalRef.current !== null) {
            window.clearInterval(skipCountdownIntervalRef.current);
            skipCountdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearPrerollTimers]);

  const handleSkipPreroll = useCallback(() => {
    completePreroll('completed');
  }, [completePreroll]);

  const handlePrerollEnded = useCallback(() => {
    completePreroll('completed');
  }, [completePreroll]);

  const handlePrerollPlaybackError = useCallback(() => {
    setPrerollError('Preroll media playback failed');
    completePreroll('failed');
  }, [completePreroll]);

  useEffect(() => {
    if (!shouldResolvePreroll) {
      clearPrerollTimers();
      setPrerollQueue([]);
      setPrerollQueueIndex(0);
      setPrerollMediaUrl(null);
      setPrerollDurationSeconds(null);
      setPrerollError(null);
      setShowPreroll(false);
      setPrerollNeedsInteraction(false);
      setPrerollStatus('idle');
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), PREROLL_MAX_WAIT_MS);

    const resolvePreroll = async () => {
      setPrerollQueue([]);
      setPrerollQueueIndex(0);
      setPrerollMediaUrl(null);
      setPrerollDurationSeconds(null);
      setPrerollError(null);
      setShowPreroll(false);
      setPrerollNeedsInteraction(false);
      setPrerollStatus('loading');
      setPrerollPlaybackKey((prev) => prev + 1);

      try {
        const settledItems = await Promise.allSettled(
          normalizedAdTagUrls.map(async (tagUrl) => {
            if (/\.(mp4|webm|ogg)(\?|$)/i.test(tagUrl)) {
              return {
                mediaUrl: tagUrl,
                durationSeconds: null,
              };
            }

            const response = await fetch(
              `/api/video/preroll?tagUrl=${encodeURIComponent(tagUrl)}`,
              {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
              }
            );

            const payload = (await response.json().catch(() => null)) as PrerollResolveResponse | null;
            if (!response.ok || !payload?.success || !payload?.mediaUrl) {
              throw new Error(payload?.error || `Preroll resolver failed (${response.status})`);
            }

            return {
              mediaUrl: payload.mediaUrl,
              durationSeconds:
                typeof payload.durationSeconds === 'number' ? payload.durationSeconds : null,
            };
          })
        );

        if (cancelled) return;

        const resolvedItems = settledItems.flatMap((item, index) => {
          if (item.status === 'fulfilled') {
            return [item.value];
          }
          const reason = item.reason instanceof Error ? item.reason.message : String(item.reason);
          console.warn(`[VideoPlayer] Failed to resolve adTag #${index + 1}: ${reason}`);
          return [];
        });

        const mediaQueue = resolvedItems
          .map((item) => item.mediaUrl)
          .filter((value, index, self) => self.indexOf(value) === index);

        if (mediaQueue.length === 0) {
          throw new Error('No playable preroll media found');
        }

        const firstItem = resolvedItems.find((item) => item.mediaUrl === mediaQueue[0]) || null;

        setPrerollQueue(mediaQueue);
        setPrerollQueueIndex(0);
        setPrerollMediaUrl(mediaQueue[0]);
        setPrerollDurationSeconds(firstItem?.durationSeconds ?? null);
        setPrerollError(null);
        setShowPreroll(true);
        setPrerollNeedsInteraction(false);
        setPrerollStatus('ready');
        setPrerollPlaybackKey((prev) => prev + 1);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown preroll resolver error';
        console.warn('[VideoPlayer] DSP preroll resolve failed:', message);
        setPrerollQueue([]);
        setPrerollQueueIndex(0);
        setPrerollError(message);
        setShowPreroll(false);
        setPrerollNeedsInteraction(false);
        setPrerollStatus('failed');
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    resolvePreroll();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [clearPrerollTimers, normalizedAdTagUrls, shouldResolvePreroll]);

  useEffect(() => {
    if (type !== 'instream') return;
    if (!showPreroll || !prerollMediaUrl) return;

    const prerollVideo = prerollVideoRef.current;
    if (!prerollVideo) return;

    const timerId = window.setTimeout(() => {
      prerollVideo.play().catch(() => {
        setPrerollNeedsInteraction(true);
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [prerollMediaUrl, showPreroll, type, prerollPlaybackKey]);

  useEffect(() => {
    return () => {
      clearPrerollTimers();
    };
  }, [clearPrerollTimers]);

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

  const shouldObserveVoxSlot =
    Boolean(voxPlaceId) && (type === 'outstream' || shouldUseVoxInstreamOverlay);

  // Отслеживаем, когда VOX наполнил рекламный контейнер.
  useEffect(() => {
    const slot = adSlotRef.current;
    if (!shouldObserveVoxSlot || !slot) return;

    const markLoaded = () => {
      const hasPayload = hasRenderableAdContent(slot);
      if (hasPayload) {
        setAdLoaded(true);
        setHasAdContent(true);
      }
    };

    setAdLoaded(false);
    setHasAdContent(true);

    const observer = new MutationObserver(() => {
      markLoaded();
    });

    observer.observe(slot, { childList: true, subtree: true, attributes: true });
    const timers = [1200, 2400, 3600].map((delay) => window.setTimeout(markLoaded, delay));
    const hardTimeout = window.setTimeout(() => {
      if (!hasRenderableAdContent(slot)) {
        setHasAdContent(false);
        setAdLoaded(false);
      }
    }, 3500);

    markLoaded();

    return () => {
      observer.disconnect();
      timers.forEach((timerId) => window.clearTimeout(timerId));
      window.clearTimeout(hardTimeout);
    };
  }, [currentVideo, shouldObserveVoxSlot]);

  // Получить размеры контейнера по типу
  const getContainerDimensions = () => {
    switch (type) {
      case 'instream':
        if (!currentVideo) {
          return {
            width: '100%',
            maxWidth: '420px',
            minHeight: '250px'
          };
        }
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
  const isSidebarOutstreamPrefetch =
    type === 'outstream' &&
    position === 'sidebar-sticky' &&
    !adLoaded &&
    hasAdContent;

  const resolvedPoster = (() => {
    if (posterUrl) return posterUrl;
    if (!currentVideo) return undefined;
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(currentVideo)) return undefined;
    return `${currentVideo.replace(/\/$/, '')}/thumbnail.jpg`;
  })();

  const shouldRenderPrerollOverlay =
    type === 'instream' && showPreroll && Boolean(prerollMediaUrl);
  const shouldShowVoxLoader = shouldUseVoxInstreamOverlay && !adLoaded && !isPlaying;

  // Instream should render only when we have at least one monetizable/content source.
  if (type === 'instream' && !hasInstreamRenderableContent) {
    return null;
  }

  // Outstream with no loaded creative should disappear instead of showing a stuck loading box.
  if (type === 'outstream' && !hasAdContent) {
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
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        ...(isSidebarOutstreamPrefetch
          ? {
              position: 'fixed',
              left: '-10000px',
              top: '-10000px',
              margin: 0,
              boxShadow: 'none',
              borderRadius: 0,
            }
          : {})
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
                controls={!shouldRenderPrerollOverlay}
                playsInline
                muted={muted}
                poster={resolvedPoster}
                onPlay={(event) => {
                  if (shouldRenderPrerollOverlay) {
                    event.currentTarget.pause();
                    setIsPlaying(false);
                    return;
                  }
                  setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
              >
                <source src={currentVideo} type="video/mp4" />
                Your browser does not support video playback.
              </video>

              {/* VOX Preroll Ad Container */}
              {shouldUseVoxInstreamOverlay && (
                <div
                  ref={adSlotRef}
                  data-hyb-ssp-ad-place={voxPlaceId}
                  data-ad-placement="video"
                  className="absolute inset-0 z-10"
                  style={{
                    display: isPlaying || shouldRenderPrerollOverlay ? 'none' : 'block',
                    pointerEvents: 'auto'
                  }}
                />
              )}

              {shouldShowVoxLoader && !shouldRenderPrerollOverlay && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-sm pointer-events-none">
                  Loading video advertisement...
                </div>
              )}

              {/* Video Title Overlay */}
              {videoTitle && !isPlaying && !shouldRenderPrerollOverlay && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-5">
                  <h3 className="text-white font-semibold text-lg">
                    {videoTitle}
                  </h3>
                </div>
              )}
            </>
          ) : (
            // Нет видео - только реклама
            <div className="w-full min-h-[250px] flex items-center justify-center bg-gray-900/90 relative">
              {shouldUseVoxInstreamOverlay ? (
                <div
                  ref={adSlotRef}
                  data-hyb-ssp-ad-place={voxPlaceId}
                  data-ad-placement="video"
                  className="w-full flex items-center justify-center"
                  style={{ minHeight: '250px' }}
                />
              ) : !shouldRenderPrerollOverlay ? (
                <p className="text-gray-400">Video content not available</p>
              ) : null}
              {shouldUseVoxInstreamOverlay && !adLoaded && !shouldRenderPrerollOverlay && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-sm pointer-events-none">
                  Loading video advertisement...
                </div>
              )}
            </div>
          )}

          {shouldResolvePreroll && prerollStatus === 'loading' && !shouldRenderPrerollOverlay && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 text-white text-sm pointer-events-none">
              Loading preroll...
            </div>
          )}

          {shouldRenderPrerollOverlay && prerollMediaUrl && (
            <div className="absolute inset-0 z-30 bg-black">
              <video
                key={`${prerollMediaUrl}-${prerollPlaybackKey}`}
                ref={prerollVideoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
                controls={false}
                onPlay={() => {
                  setPrerollNeedsInteraction(false);
                  setPrerollStatus('playing');
                  armSkipCountdown();
                }}
                onEnded={handlePrerollEnded}
                onError={handlePrerollPlaybackError}
                onLoadedMetadata={(event) => {
                  if (prerollDurationSeconds) return;
                  const duration = event.currentTarget.duration;
                  if (Number.isFinite(duration) && duration > 0) {
                    setPrerollDurationSeconds(duration);
                  }
                }}
              >
                <source src={prerollMediaUrl} type="video/mp4" />
                Your browser does not support video playback.
              </video>

              <div className="absolute top-3 right-3 z-40">
                {skipAvailable ? (
                  <button
                    type="button"
                    onClick={handleSkipPreroll}
                    className="px-3 py-1 rounded bg-black/75 hover:bg-black/90 text-white text-xs font-medium"
                  >
                    Skip ad
                  </button>
                ) : (
                  <div className="px-3 py-1 rounded bg-black/65 text-white text-xs">
                    Skip in {skipCountdown}s
                  </div>
                )}
              </div>

              {prerollNeedsInteraction && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={() => {
                      prerollVideoRef.current?.play().catch(() => undefined);
                    }}
                    className="pointer-events-auto px-4 py-2 rounded bg-white/90 hover:bg-white text-black text-sm font-semibold"
                  >
                    Play ad
                  </button>
                </div>
              )}

              <div className="absolute left-3 bottom-3 z-40 bg-black/65 text-white text-xs px-2 py-1 rounded">
                Ad
                {typeof prerollDurationSeconds === 'number' && prerollDurationSeconds > 0
                  ? ` · ${Math.ceil(prerollDurationSeconds)}s`
                  : ''}
              </div>
            </div>
          )}

          {shouldResolvePreroll &&
            prerollStatus === 'failed' &&
            prerollError &&
            !shouldUseVoxInstreamOverlay && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-sm pointer-events-none">
                  {currentVideo ? 'Preroll unavailable. Content playback only.' : 'Preroll unavailable.'}
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
                  minHeight: outstreamMinHeight
                }}
              />
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
