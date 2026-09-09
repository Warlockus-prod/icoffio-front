'use client';

import { useEffect, useRef, useState } from 'react';
import { isPrebidEnabled, useAdsProvider } from '@/lib/ads-provider';

interface PrebidAdProps {
  /** DOM id the Bidio SDK looks up. Must match the partner's placement config. */
  id: string;
  className?: string;
  enabled?: boolean;
  /** Show a small debug outline + label even when the slot is empty. */
  debug?: boolean;
}

/**
 * A Bidio placement slot.
 *
 * The wrapper decides the creative size itself, so nothing here is hard-sized:
 * the slot stays collapsed until the SDK injects content, then expands. That
 * keeps empty/unregistered placements from leaving visible gaps in the article.
 */
export function PrebidAd({ id, className = '', enabled = true, debug = false }: PrebidAdProps) {
  const provider = useAdsProvider();
  const slotRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  const active = enabled && isPrebidEnabled(provider);

  useEffect(() => {
    if (!active) return;
    const el = slotRef.current;
    if (!el) return;

    const check = () => {
      const hasContent = el.children.length > 0 || el.querySelector('iframe') !== null;
      setFilled((current) => (current === hasContent ? current : hasContent));
    };

    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true });

    // The SDK can fill a slot well after mount (auction + render).
    const timers = [1000, 3000, 6000, 10000].map((delay) =>
      window.setTimeout(check, delay)
    );

    check();

    return () => {
      observer.disconnect();
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [active, id]);

  if (!active) return null;

  const showChrome = filled || debug;

  return (
    <div
      data-prebid-wrapper={id}
      data-prebid-filled={filled ? 'true' : 'false'}
      className={`not-prose ${showChrome ? 'my-8' : ''} ${className}`.trim()}
    >
      {showChrome && (
        <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Reklama
        </div>
      )}
      <div
        id={id}
        ref={slotRef}
        data-prebid-slot={id}
        className={`mx-auto flex justify-center ${
          debug && !filled ? 'min-h-[90px] items-center border border-dashed border-neutral-300 text-xs text-neutral-400 dark:border-neutral-700' : ''
        }`.trim()}
      >
        {debug && !filled ? `#${id} — empty` : null}
      </div>
    </div>
  );
}
