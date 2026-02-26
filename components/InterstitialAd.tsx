'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface InterstitialAdProps {
  placeId: string;
  /** Delay in seconds before showing (default: 15) */
  delaySeconds?: number;
  /** Session storage key to prevent repeated shows */
  sessionKey?: string;
}

/**
 * Fullscreen interstitial ad overlay (320x480).
 * Shows once per session after a scroll/time delay.
 * User can close with X button. Respects session storage.
 */
export function InterstitialAd({
  placeId,
  delaySeconds = 15,
  sessionKey = 'icoffio_interstitial_shown',
}: InterstitialAdProps) {
  const [visible, setVisible] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch { /* private browsing */ }
  }, [sessionKey]);

  useEffect(() => {
    // Don't show if already shown this session
    try {
      if (sessionStorage.getItem(sessionKey)) return;
    } catch { /* ok */ }

    // Don't show on desktop (xl breakpoint = 1280px)
    if (window.innerWidth >= 1280) return;

    // Show after delay
    timerRef.current = setTimeout(() => {
      setVisible(true);
      // Allow close after 2 seconds (prevent accidental instant close)
      setTimeout(() => setCanClose(true), 2000);
    }, delaySeconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delaySeconds, sessionKey]);

  // Initialize VOX for this container when it becomes visible
  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const tryInit = () => {
      if (typeof window._tx !== 'undefined' && window._tx.integrateInImage && window._tx.init) {
        window._tx.integrateInImage({ placeId, setDisplayBlock: true });
        window._tx.init();
      }
    };

    // VOX might not be ready yet, retry
    tryInit();
    const retry = setTimeout(tryInit, 1500);
    return () => clearTimeout(retry);
  }, [visible, placeId]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, canClose, close]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && canClose) close(); }}
    >
      <div className="relative">
        {/* Close button */}
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

        {/* Ad container */}
        <div
          ref={containerRef}
          data-hyb-ssp-ad-place={placeId}
          data-ad-format="320x480"
          className="w-[320px] h-[480px] bg-neutral-900 rounded-lg overflow-hidden"
        />

        {/* "Ad" label */}
        <p className="text-center text-[10px] text-neutral-400 mt-2">Advertisement</p>
      </div>
    </div>
  );
}
