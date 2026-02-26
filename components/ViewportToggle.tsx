'use client';

import { useState, useCallback, useEffect } from 'react';

type ViewMode = 'desktop' | 'mobile';

/**
 * Simulates mobile viewport by constraining page width.
 * Adds a visual frame + toggles body width.
 */
export function ViewportToggle() {
  const [mode, setMode] = useState<ViewMode>('desktop');

  const toggle = useCallback(() => {
    setMode(prev => prev === 'desktop' ? 'mobile' : 'desktop');
  }, []);

  // Apply/remove mobile simulation styles
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (mode === 'mobile') {
      html.style.setProperty('--sim-width', '375px');
      body.classList.add('viewport-sim-mobile');
    } else {
      html.style.removeProperty('--sim-width');
      body.classList.remove('viewport-sim-mobile');
    }

    return () => {
      html.style.removeProperty('--sim-width');
      body.classList.remove('viewport-sim-mobile');
    };
  }, [mode]);

  // Inject global CSS once
  useEffect(() => {
    const id = 'viewport-sim-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      body.viewport-sim-mobile {
        max-width: var(--sim-width, 375px) !important;
        margin: 0 auto !important;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 0 80px rgba(0,0,0,0.08) !important;
        overflow-x: hidden !important;
        position: relative !important;
      }
      body.viewport-sim-mobile::before {
        content: 'Mobile Preview (375px)';
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        background: #3b82f6;
        color: white;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 12px;
        border-radius: 0 0 8px 8px;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Only show on desktop screens (no point toggling on actual mobile)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isDesktop) return null;

  return (
    <button
      onClick={toggle}
      aria-label={mode === 'desktop' ? 'Switch to mobile view' : 'Switch to desktop view'}
      title={mode === 'desktop' ? 'Mobile preview' : 'Desktop view'}
      className="hidden lg:flex p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
    >
      {mode === 'desktop' ? (
        /* Phone icon */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ) : (
        /* Desktop icon */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}
