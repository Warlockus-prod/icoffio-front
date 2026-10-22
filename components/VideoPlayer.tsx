'use client';

/**
 * VIDEO PLAYER WITH DSP PREROLL v10.3.1
 *
 * Instream video ad player:
 * - Resolves VAST tags via /api/video/preroll → MP4 + tracking URLs
 * - Plays preroll ad with skip button
 * - Fires all VAST tracking pixels (impression, start, quartiles, complete, skip)
 * - Plays each resolved ad once, only after advertising consent
 * - Zero MutationObservers — no Chrome freeze risk
 *
 * @version 10.3.1
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoPlayerPosition, VideoPlayerType } from '@/lib/config/video-players';
import { useCookieConsent } from '@/lib/useCookieConsent';

interface VastTracking {
  impression: string[];
  start: string[];
  firstQuartile: string[];
  midpoint: string[];
  thirdQuartile: string[];
  complete: string[];
  skip: string[];
  mute: string[];
  unmute: string[];
  pause: string[];
  resume: string[];
  error: string[];
  clickThrough: string | null;
  clickTracking: string[];
}

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
const EMPTY_TRACKING: VastTracking = {
  impression: [],
  start: [],
  firstQuartile: [],
  midpoint: [],
  thirdQuartile: [],
  complete: [],
  skip: [],
  mute: [],
  unmute: [],
  pause: [],
  resume: [],
  error: [],
  clickThrough: null,
  clickTracking: [],
};

type PlayerState = 'loading' | 'ready' | 'playing' | 'ended' | 'failed';

interface ResolvedAd {
  mediaUrl: string;
  durationSeconds: number | null;
  tracking: VastTracking;
}

/**
 * Fire tracking pixel URLs (non-blocking, best-effort).
 * Uses Image beacons for maximum compatibility — works cross-origin without CORS.
 */
function firePixels(urls: string[]) {
  for (const url of urls) {
    if (!url) continue;
    try {
      const img = new Image();
      img.src = url;
    } catch {
      // best-effort — ignore failures
    }
  }
}

export default function VideoPlayer({
  type,
  position,
  adTagUrl,
  adTagPlaylist,
  videoTitle,
  autoplay = true,
  muted = true,
  className = '',
}: VideoPlayerProps) {
  const { consentState } = useCookieConsent();
  const hasConsent = consentState.hasConsented && consentState.preferences.advertising;
  // Use stable reference for empty playlist
  const playlist = adTagPlaylist && adTagPlaylist.length > 0 ? adTagPlaylist : EMPTY_PLAYLIST;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [adQueue, setAdQueue] = useState<ResolvedAd[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const skipTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  // Track which quartile pixels have been fired for current ad
  const firedQuartilesRef = useRef<Set<string>>(new Set());
  // Track if impression was fired for current ad
  const impressionFiredRef = useRef(false);
  const finishedAdRef = useRef(false);
  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    const previous = videoRef.current;
    if (!video && previous) {
      // Removing a media element must also stop its playback/downloads, in
      // particular when advertising consent is withdrawn mid-ad.
      finishedAdRef.current = true;
      previous.pause();
      previous.querySelector('source')?.removeAttribute('src');
      previous.removeAttribute('src');
      previous.load();
    }
    videoRef.current = video;
  }, []);

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
    if (!hasConsent) {
      clearTimers();
      setAdQueue([]);
      setState('loading');
      return;
    }
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
              return { mediaUrl: tagUrl, durationSeconds: null, tracking: EMPTY_TRACKING };
            }

            const res = await fetch(
              `/api/video/preroll?tagUrl=${encodeURIComponent(tagUrl)}`,
              { signal: controller.signal, cache: 'no-store' }
            );
            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.success || !data?.mediaUrl) {
              throw new Error(data?.reason || data?.error || `HTTP ${res.status}`);
            }

            return {
              mediaUrl: data.mediaUrl,
              durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : null,
              tracking: data.tracking || EMPTY_TRACKING,
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
          console.info('[VideoAd] No playable preroll:', results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => result.reason instanceof Error ? result.reason.message : 'resolve_failed'));
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
  }, [adTagUrlsKey, hasConsent, isUnsupported, noAds, clearTimers]);

  // --- Autoplay when ad is ready ---
  useEffect(() => {
    if (state !== 'ready' || !currentAd || !hasConsent) return;

    // Reset tracking state for new ad
    firedQuartilesRef.current.clear();
    impressionFiredRef.current = false;
    finishedAdRef.current = false;
    setMediaDuration(null);
    setSkipAvailable(false);
    setSkipCountdown(Math.ceil(PREROLL_SKIP_DELAY_MS / 1000));
    setNeedsInteraction(!autoplay);

    const video = videoRef.current;
    if (!video) return;

    // Resolving a creative is not an impression. Only onPlaying records it.
    if (!autoplay) return;

    // Small delay for React to render the video element
    const id = window.setTimeout(() => {
      video.play().catch(() => {
        setNeedsInteraction(true);
      });
    }, 150);

    return () => window.clearTimeout(id);
  }, [state, currentAd, queueIndex, hasConsent, autoplay]);

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
    if (!hasConsent || finishedAdRef.current) return;
    setNeedsInteraction(false);
    setState('playing');
    // `playing` also fires after buffering or resuming. Count this ad once.
    if (impressionFiredRef.current) return;
    impressionFiredRef.current = true;
    startSkipCountdown();
    if (currentAd?.tracking.impression.length) {
      firePixels(currentAd.tracking.impression);
    }

    // Fire start tracking
    if (currentAd?.tracking.start.length) {
      firePixels(currentAd.tracking.start);
    }
  }, [startSkipCountdown, currentAd, hasConsent]);

  /** Fire quartile tracking based on video progress */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentAd || !hasConsent || !impressionFiredRef.current || finishedAdRef.current) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const progress = video.currentTime / duration;
    const t = currentAd.tracking;
    const fired = firedQuartilesRef.current;

    if (progress >= 0.25 && !fired.has('firstQuartile') && t.firstQuartile.length > 0) {
      fired.add('firstQuartile');
      firePixels(t.firstQuartile);
    }
    if (progress >= 0.50 && !fired.has('midpoint') && t.midpoint.length > 0) {
      fired.add('midpoint');
      firePixels(t.midpoint);
    }
    if (progress >= 0.75 && !fired.has('thirdQuartile') && t.thirdQuartile.length > 0) {
      fired.add('thirdQuartile');
      firePixels(t.thirdQuartile);
    }
  }, [currentAd, hasConsent]);

  const advanceToNextAd = useCallback(() => {
    if (queueIndex + 1 < adQueue.length) {
      setQueueIndex(queueIndex + 1);
      setState('ready');
    } else {
      setState('ended');
    }
  }, [queueIndex, adQueue.length]);

  const handleEnded = useCallback(() => {
    if (!hasConsent || finishedAdRef.current) return;
    finishedAdRef.current = true;
    clearTimers();

    // Fire complete tracking
    if (currentAd?.tracking.complete.length) {
      firePixels(currentAd.tracking.complete);
    }

    // A resolved auction and its tracking URLs must never be replayed in a loop.
    advanceToNextAd();
  }, [clearTimers, currentAd, hasConsent, advanceToNextAd]);

  const handleError = useCallback(() => {
    if (!hasConsent || finishedAdRef.current) return;
    finishedAdRef.current = true;
    clearTimers();

    // Fire error tracking
    if (currentAd?.tracking.error.length) {
      firePixels(currentAd.tracking.error);
    }

    // Try next ad in queue
    if (queueIndex + 1 < adQueue.length) {
      advanceToNextAd();
    } else {
      setState('failed');
    }
  }, [adQueue.length, clearTimers, queueIndex, currentAd, hasConsent, advanceToNextAd]);

  const handleSkip = useCallback(() => {
    if (!hasConsent || !skipAvailable || finishedAdRef.current) return;
    finishedAdRef.current = true;
    clearTimers();
    if (videoRef.current) videoRef.current.pause();

    // Fire skip tracking
    if (currentAd?.tracking.skip.length) {
      firePixels(currentAd.tracking.skip);
    }

    // A skip is not a completion.
    advanceToNextAd();
  }, [clearTimers, advanceToNextAd, currentAd, hasConsent, skipAvailable]);

  const handleManualPlay = useCallback(() => {
    if (!hasConsent) return;
    videoRef.current?.play().catch(() => undefined);
  }, [hasConsent]);

  /** Handle click on the video — open clickThrough + fire clickTracking */
  const handleVideoClick = useCallback(() => {
    if (!currentAd || !hasConsent || finishedAdRef.current) return;
    const t = currentAd.tracking;

    // Fire click tracking pixels
    if (t.clickTracking.length > 0) {
      firePixels(t.clickTracking);
    }

    // Open clickThrough URL in new tab
    if (t.clickThrough) {
      window.open(t.clickThrough, '_blank', 'noopener,noreferrer');
    }
  }, [currentAd, hasConsent]);

  const handlePause = useCallback(() => {
    // Only fire pause if we're in playing state (not when skip/ended triggers pause)
    if (hasConsent && !finishedAdRef.current && state === 'playing' && currentAd?.tracking.pause.length) {
      firePixels(currentAd.tracking.pause);
    }
  }, [state, currentAd, hasConsent]);

  // --- Don't render if unsupported, no ads, failed, or ended ---
  if (!hasConsent || isUnsupported || noAds || state === 'failed' || state === 'ended') return null;

  const durationSeconds = currentAd?.durationSeconds || mediaDuration;
  const durationLabel =
    durationSeconds && durationSeconds > 0
      ? ` · ${Math.ceil(durationSeconds)}s`
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
              ref={attachVideo}
              className="w-full object-cover"
              style={{ maxHeight: '450px', cursor: currentAd.tracking.clickThrough ? 'pointer' : undefined }}
              playsInline
              muted={muted}
              controls={false}
              onPlaying={handlePlay}
              onEnded={handleEnded}
              onError={handleError}
              onTimeUpdate={handleTimeUpdate}
              onPause={handlePause}
              onClick={handleVideoClick}
              onLoadedMetadata={(e) => {
                if (currentAd.durationSeconds) return;
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) {
                  setMediaDuration(d);
                }
              }}
            >
              <source src={currentAd.mediaUrl} />
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
