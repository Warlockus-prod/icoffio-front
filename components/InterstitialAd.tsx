'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface InterstitialAdProps {
  placeId: string;
  /** Delay in seconds before showing (minimum wait, ad must also be filled) */
  delaySeconds?: number;
  /** Session storage key to prevent repeated shows */
  sessionKey?: string;
}

/**
 * Fullscreen interstitial ad overlay (320x480).
 *
 * 1. Renders ad container immediately (hidden, off-screen) so AdManager + VOX can fill it
 * 2. Watches for ad content to appear via MutationObserver
 * 3. Only shows the fullscreen overlay when BOTH delay has passed AND ad is actually filled
 * 4. If ad doesn't fill within 20 seconds, gives up silently (no empty black box)
 * 5. Shows once per session via sessionStorage
 */
export function InterstitialAd({
  placeId,
  delaySeconds = 3,
  sessionKey = 'icoffio_interstitial_shown',
}: InterstitialAdProps) {
  const [phase, setPhase] = useState<'init' | 'preloading' | 'visible' | 'closed' | 'skip'>('init');
  const [canClose, setCanClose] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const delayPassedRef = useRef(false);
  const adFilledRef = useRef(false);

  const close = useCallback(() => {
    setPhase('closed');
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch { /* private browsing */ }
  }, [sessionKey]);

  // Step 1: Check eligibility (runs once on mount)
  useEffect(() => {
    // Already shown this session?
    try {
      if (sessionStorage.getItem(sessionKey)) {
        setPhase('skip');
        return;
      }
    } catch { /* ok */ }

    // Desktop? Don't show interstitial (xl breakpoint = 1280px)
    if (window.innerWidth >= 1280) {
      setPhase('skip');
      return;
    }

    // Eligible — start preloading
    setPhase('preloading');
  }, [sessionKey]);

  // Step 2: Delay timer
  useEffect(() => {
    if (phase !== 'preloading') return;

    const timer = setTimeout(() => {
      delayPassedRef.current = true;
      // If ad already filled, show immediately
      if (adFilledRef.current) {
        setPhase('visible');
      }
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [phase, delaySeconds]);

  // Step 3: Watch for ad content to appear in the container
  useEffect(() => {
    if (phase !== 'preloading') return;
    const container = containerRef.current;
    if (!container) return;

    const checkFill = (): boolean => {
      const hasIframe = container.querySelector('iframe') !== null;
      const hasImg = container.querySelector('img') !== null;
      const hasChildren = container.children.length > 0;

      if (hasIframe || hasImg || hasChildren) {
        adFilledRef.current = true;
        if (delayPassedRef.current) {
          setPhase('visible');
        }
        return true;
      }
      return false;
    };

    // MutationObserver to detect when VOX injects ad content
    const observer = new MutationObserver(() => {
      if (checkFill()) observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true });

    // Fallback polling (in case MutationObserver misses something)
    const pollTimers = [1000, 2000, 4000, 6000, 8000, 10000, 12000].map(delay =>
      setTimeout(() => {
        if (checkFill()) observer.disconnect();
      }, delay)
    );

    // Timeout: give up after 20 seconds (no empty overlay shown)
    const giveUpTimer = setTimeout(() => {
      observer.disconnect();
      if (!adFilledRef.current) {
        // Mark as "shown" so we don't retry endlessly
        try { sessionStorage.setItem(sessionKey, '1'); } catch { /* ok */ }
        setPhase('skip');
      }
    }, 20000);

    // Initial check
    checkFill();

    return () => {
      observer.disconnect();
      pollTimers.forEach(clearTimeout);
      clearTimeout(giveUpTimer);
    };
  }, [phase, sessionKey]);

  // Step 4: Poll for VOX SDK and initialize the ad container
  useEffect(() => {
    if (phase !== 'preloading') return;
    const container = containerRef.current;
    if (!container) return;

    let initDone = false;

    const tryInit = (): boolean => {
      if (initDone) return true;
      if (typeof window._tx !== 'undefined' && window._tx.integrateInImage && window._tx.init) {
        window._tx.integrateInImage({ placeId, setDisplayBlock: true });
        window._tx.init();
        initDone = true;
        return true;
      }
      return false;
    };

    // Try immediately
    if (tryInit()) return;

    // Poll every 500ms until VOX SDK is available
    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval);
    }, 500);

    // Stop polling after 15 seconds
    const timeout = setTimeout(() => clearInterval(interval), 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [phase, placeId]);

  // Step 5: Enable close button after 2s delay when visible
  useEffect(() => {
    if (phase !== 'visible') return;
    const timer = setTimeout(() => setCanClose(true), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Step 6: Close on Escape
  useEffect(() => {
    if (phase !== 'visible') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, canClose, close]);

  // Don't render anything if skipped or closed
  if (phase === 'skip' || phase === 'closed' || phase === 'init') return null;

  const isVisible = phase === 'visible';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        isVisible
          ? 'bg-black/70 backdrop-blur-sm'
          : 'pointer-events-none opacity-0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget && canClose) close(); }}
    >
      <div className="relative">
        {/* Close button (only when visible) */}
        {isVisible && (
          <button
            onClick={canClose ? close : undefined}
            disabled={!canClose}
            className={`absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
              canClose
                ? 'bg-white text-neutral-800 hover:bg-neutral-100 cursor-pointer'
                : 'bg-neutral-400 text-neutral-600 cursor-not-allowed'
            }`}
            aria-label="Close ad"
          >
            {canClose ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <span className="text-xs font-bold">...</span>
            )}
          </button>
        )}

        {/* Ad container — always in DOM so AdManager/VOX can fill it */}
        <div
          ref={containerRef}
          data-hyb-ssp-ad-place={placeId}
          data-ad-format="320x480"
          className={`w-[320px] h-[480px] overflow-hidden ${
            isVisible ? 'bg-neutral-900 rounded-lg' : ''
          }`}
        />

        {/* "Ad" label (only when visible) */}
        {isVisible && (
          <p className="text-center text-[10px] text-neutral-400 mt-2">Advertisement</p>
        )}
      </div>
    </div>
  );
}
