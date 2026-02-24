'use client';

/**
 * VIDEO PLAYER WITH DSP PREROLL v10.1.2
 *
 * Instream video ad player:
 * - Resolves VAST tags via /api/video/preroll → MP4
 * - Plays preroll ad with skip button
 * - Loops ad playlist when no content video
 * - Zero MutationObservers — no Chrome freeze risk
 *
 * @version 10.1.2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoPlayerPosition, VideoPlayerType } from '@/lib/config/video-players';

interface VideoPlayerProps {
  type: VideoPlayerType;
  position: VideoPlayerPosition;
  adTagUrl?: string;
  adTagPlaylist?: string[];
  videoTitle?: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
}

const PREROLL_SKIP_DELAY_MS = 5000;
const PREROLL_RESOLVE_TIMEOUT_MS = 15000;

/** Stable empty array — avoids new reference on every render */
const EMPTY_PLAYLIST: string[] = [];

type PlayerState = 'loading' | 'ready' | 'playing' | 'ended' | 'failed';

interface ResolvedAd {
  mediaUrl: string;
  durationSeconds: number | null;
}

export default function VideoPlayer({
  type,
  position,
  adTagUrl,
  adTagPlaylist,
  videoTitle,
  muted = true,
  className = '',
}: VideoPlayerProps) {
  // Use stable reference for empty playlist
  const playlist = adTagPlaylist && adTagPlaylist.length > 0 ? adTagPlaylist : EMPTY_PLAYLIST;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [adQueue, setAdQueue] = useState<ResolvedAd[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const skipTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  // Serialize ad tag URLs for stable dependency
  const adTagUrlsKey = useMemo(
    () => JSON.stringify([adTagUrl || '', ...playlist]),
    [adTagUrl, playlist]
  );

  // Collect and validate ad tag URLs
  const adTagUrls = useMemo(() => {
    return [adTagUrl, ...playlist]
      .flatMap((v) => (v || '').split(/\r?\n+/))
      .map((v) => v.trim())
      .filter((v) => /^https?:\/\//i.test(v));
  }, [adTagUrl, playlist]);

  const isUnsupported = type !== 'instream';
  const noAds = adTagUrls.length === 0;

  const currentAd = adQueue[queueIndex] || null;

  // --- Cleanup timers ---
  const clearTimers = useCallback(() => {
    if (skipTimerRef.current !== null) {
      window.clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // --- Resolve VAST tags on mount (uses serialized key for stable deps) ---
  useEffect(() => {
    if (isUnsupported || noAds) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), PREROLL_RESOLVE_TIMEOUT_MS);

    const resolve = async () => {
      setState('loading');

      try {
        const results = await Promise.allSettled(
          adTagUrls.map(async (tagUrl): Promise<ResolvedAd> => {
            // Direct MP4 URLs don't need resolution
            if (/\.(mp4|webm|ogg)(\?|$)/i.test(tagUrl)) {
              return { mediaUrl: tagUrl, durationSeconds: null };
            }

            const res = await fetch(
              `/api/video/preroll?tagUrl=${encodeURIComponent(tagUrl)}`,
              { signal: controller.signal, cache: 'no-store' }
            );
            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.success || !data?.mediaUrl) {
              throw new Error(data?.error || `HTTP ${res.status}`);
            }

            return {
              mediaUrl: data.mediaUrl,
              durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : null,
            };
          })
        );

        if (cancelled) return;

        const resolved = results
          .filter((r): r is PromiseFulfilledResult<ResolvedAd> => r.status === 'fulfilled')
          .map((r) => r.value);

        // Deduplicate by mediaUrl
        const seen = new Set<string>();
        const unique = resolved.filter((ad) => {
          if (seen.has(ad.mediaUrl)) return false;
          seen.add(ad.mediaUrl);
          return true;
        });

        if (unique.length === 0) {
          setState('failed');
          return;
        }

        setAdQueue(unique);
        setQueueIndex(0);
        setState('ready');
      } catch {
        if (!cancelled) setState('failed');
      } finally {
        window.clearTimeout(timeout);
      }
    };

    resolve();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adTagUrlsKey]);

  // --- Autoplay when ad is ready ---
  useEffect(() => {
    if (state !== 'ready' || !currentAd) return;

    const video = videoRef.current;
    if (!video) return;

    // Small delay for React to render the video element
    const id = window.setTimeout(() => {
      video.play().catch(() => {
        setNeedsInteraction(true);
      });
    }, 150);

    return () => window.clearTimeout(id);
  }, [state, currentAd, queueIndex]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // --- Skip countdown ---
  const startSkipCountdown = useCallback(() => {
    clearTimers();
    setSkipAvailable(false);
    setSkipCountdown(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));

    skipTimerRef.current = window.setTimeout(() => {
      setSkipAvailable(true);
      setSkipCountdown(0);
    }, PREROLL_SKIP_DELAY_MS);

    countdownRef.current = window.setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current !== null) {
            window.clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers]);

  // --- Handlers ---
  const handlePlay = useCallback(() => {
    setNeedsInteraction(false);
    setState('playing');
    startSkipCountdown();
  }, [startSkipCountdown]);

  const handleEnded = useCallback(() => {
    clearTimers();
    // Loop through ad queue
    if (adQueue.length > 1) {
      const next = (queueIndex + 1) % adQueue.length;
      setQueueIndex(next);
      setSkipAvailable(false);
      setSkipCountdown(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));
      setState('ready');
    } else if (adQueue.length === 1) {
      // Single ad — loop it
      setSkipAvailable(false);
      setSkipCountdown(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));
      setState('ready');
    } else {
      setState('ended');
    }
  }, [adQueue.length, clearTimers, queueIndex]);

  const handleError = useCallback(() => {
    clearTimers();
    // Try next ad in queue
    if (adQueue.length > 1) {
      const next = (queueIndex + 1) % adQueue.length;
      setQueueIndex(next);
      setState('ready');
    } else {
      setState('failed');
    }
  }, [adQueue.length, clearTimers, queueIndex]);

  const handleSkip = useCallback(() => {
    clearTimers();
    if (videoRef.current) videoRef.current.pause();
    // Advance to next or loop
    handleEnded();
  }, [clearTimers, handleEnded]);

  const handleManualPlay = useCallback(() => {
    videoRef.current?.play().catch(() => undefined);
  }, []);

  // --- Don't render if unsupported, no ads, failed, or ended ---
  if (isUnsupported || noAds || state === 'failed' || state === 'ended') return null;

  const durationLabel =
    currentAd?.durationSeconds && currentAd.durationSeconds > 0
      ? ` · ${Math.ceil(currentAd.durationSeconds)}s`
      : '';

  return (
    <div
      className={`video-player-container ${className}`}
      style={{
        width: '100%',
        maxWidth: position === 'article-end' ? '800px' : '100%',
        margin: position === 'article-end' ? '40px auto' : '20px 0',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        aspectRatio: currentAd ? undefined : '16/9',
      }}
      data-player-type={type}
      data-position={position}
    >
      <div className="relative w-full">
        {state === 'loading' && (
          <div
            className="flex items-center justify-center bg-black text-white text-sm"
            style={{ minHeight: '250px' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading ad...
            </div>
          </div>
        )}

        {currentAd && (state === 'ready' || state === 'playing') && (
          <>
            <video
              key={`${currentAd.mediaUrl}-${queueIndex}`}
              ref={videoRef}
              className="w-full object-cover"
              style={{ maxHeight: '450px' }}
              playsInline
              muted={muted}
              controls={false}
              onPlay={handlePlay}
              onEnded={handleEnded}
              onError={handleError}
              onLoadedMetadata={(e) => {
                if (currentAd.durationSeconds) return;
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) {
                  setAdQueue((prev) =>
                    prev.map((ad, i) =>
                      i === queueIndex ? { ...ad, durationSeconds: d } : ad
                    )
                  );
                }
              }}
            >
              <source src={currentAd.mediaUrl} type="video/mp4" />
            </video>

            {/* Skip button */}
            <div className="absolute top-3 right-3 z-10">
              {skipAvailable ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-3 py-1.5 rounded bg-black/75 hover:bg-black/90 text-white text-xs font-medium transition-colors"
                >
                  Skip ad &#x25B6;
                </button>
              ) : state === 'playing' ? (
                <div className="px-3 py-1.5 rounded bg-black/60 text-white/80 text-xs">
                  Skip in {skipCountdown}s
                </div>
              ) : null}
            </div>

            {/* Manual play button (autoplay blocked) */}
            {needsInteraction && (
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleManualPlay}
                  className="px-5 py-2.5 rounded-lg bg-white/90 hover:bg-white text-black text-sm font-semibold shadow-lg transition-colors"
                >
                  &#9654; Play ad
                </button>
              </div>
            )}

            {/* Ad badge */}
            <div className="absolute left-3 bottom-3 z-10 bg-black/65 text-white text-xs px-2 py-1 rounded">
              Ad{durationLabel}
            </div>

            {/* Video title */}
            {videoTitle && state !== 'playing' && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8 z-5">
                <h3 className="text-white font-semibold text-sm line-clamp-1">
                  {videoTitle}
                </h3>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
