'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ToastNotification';

// Module-level console error buffer (not React state to avoid re-renders)
const consoleErrors: string[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    consoleErrors.push(`[Error] ${e.message} (${e.filename}:${e.lineno})`);
    if (consoleErrors.length > 10) consoleErrors.shift();
  });
  window.addEventListener('unhandledrejection', (e) => {
    consoleErrors.push(`[Promise] ${e.reason?.message || String(e.reason)}`);
    if (consoleErrors.length > 10) consoleErrors.shift();
  });
}

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug', labelPl: '🐛 Błąd' },
  { value: 'ui_issue', label: '🎨 UI Issue', labelPl: '🎨 Problem z UI' },
  { value: 'content_error', label: '📝 Content Error', labelPl: '📝 Błąd treści' },
  { value: 'feature_request', label: '💡 Feature Request', labelPl: '💡 Pomysł' },
  { value: 'other', label: '📋 Other', labelPl: '📋 Inne' },
] as const;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

export function FeedbackModal({ isOpen, onClose, locale = 'en' }: FeedbackModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<'form' | 'capturing' | 'success'>('form');
  const [screenshot, setScreenshot] = useState<HTMLImageElement | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const isPl = locale === 'pl';

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setScreenshot(null);
      setScreenshotBlob(null);
      setDescription('');
      setCategory('bug');
      setEmail('');
      setStep('form');
      setIsCapturing(false);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setStep('capturing');

    // Wait for modal to fully unmount from DOM
    await new Promise(r => setTimeout(r, 500));

    try {
      const html2canvas = (await import('html2canvas')).default;

      // Capture the visible viewport — skip all cross-origin elements
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 1, // Fixed scale=1 to avoid memory issues on mobile
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        // Skip problematic elements: iframes, ads, cross-origin images
        ignoreElements: (el: Element) => {
          if (el.tagName === 'IFRAME' || el.tagName === 'VIDEO') return true;
          if (el.getAttribute('data-hyb-ssp-ad-place') !== null) return true;
          // Skip cross-origin images that would taint the canvas
          if (el.tagName === 'IMG') {
            const src = (el as HTMLImageElement).src || '';
            if (src && !src.startsWith(window.location.origin) && !src.startsWith('data:')) {
              return true;
            }
          }
          return false;
        },
      });

      const dataUrl = canvas.toDataURL('image/png');

      const img = new Image();
      img.onload = () => {
        setScreenshot(img);
        setStep('form');
        setIsCapturing(false);

        // Draw initial screenshot on canvas
        requestAnimationFrame(() => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const maxW = Math.min(640, window.innerWidth - 64);
              const scale = maxW / img.width;
              canvasRef.current.width = img.width * scale;
              canvasRef.current.height = img.height * scale;
              ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        });
      };
      img.onerror = () => {
        console.error('[Feedback] Screenshot image load failed');
        setStep('form');
        setIsCapturing(false);
        showToast(isPl ? 'Nie udało się zrobić zrzutu ekranu' : 'Failed to capture screenshot', 'error');
      };
      img.src = dataUrl;
    } catch (err) {
      console.error('[Feedback] Screenshot capture failed:', err);
      setStep('form');
      setIsCapturing(false);
      showToast(isPl ? 'Nie udało się zrobić zrzutu ekranu' : 'Failed to capture screenshot', 'error');
    }
  }, [isPl, showToast]);

  // Canvas drawing handlers
  const getCanvasPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!screenshot) return;
    setIsDrawing(true);
    lastPoint.current = getCanvasPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !canvasRef.current || !lastPoint.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  // Clear annotations
  const clearAnnotations = () => {
    if (!screenshot || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.drawImage(screenshot, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Remove screenshot
  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotBlob(null);
  };

  // Submit feedback
  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 10) {
      showToast(isPl ? 'Opisz problem (min. 10 znaków)' : 'Describe the issue (min 10 characters)', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if captured
      if (screenshot && canvasRef.current) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvasRef.current!.toBlob(resolve, 'image/png');
        });

        if (blob) {
          const formData = new FormData();
          formData.append('screenshot', blob, 'feedback-screenshot.png');

          const uploadRes = await fetch('/api/upload-feedback-screenshot', {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success) {
            screenshotUrl = uploadData.url;
          }
        }
      }

      // Submit feedback
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          category,
          screenshot_url: screenshotUrl,
          email: email.trim() || null,
          page_url: window.location.href,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          user_agent: navigator.userAgent,
          color_scheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          locale,
          console_errors: [...consoleErrors],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStep('success');
      } else {
        throw new Error(data.error || 'Failed to submit');
      }
    } catch (err) {
      console.error('[Feedback] Submit error:', err);
      showToast(
        isPl ? 'Nie udało się wysłać zgłoszenia' : 'Failed to submit feedback',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for "report another"
  const resetForm = () => {
    setScreenshot(null);
    setScreenshotBlob(null);
    setDescription('');
    setCategory('bug');
    setStep('form');
  };

  if (!isOpen && !isCapturing) return null;

  // During capture — hide the modal completely
  if (isCapturing) return null;

  // Success screen
  if (step === 'success') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm text-center px-6 py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {isPl ? 'Wysłano!' : 'Sent!'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            {isPl
              ? 'Dziękujemy za zgłoszenie. Zajmiemy się tym.'
              : 'Thank you for your report. We\'ll look into it.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              {isPl ? 'Zamknij' : 'Close'}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {isPl ? 'Nowe zgłoszenie' : 'Report another'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {isPl ? '🐛 Zgłoś problem' : '🐛 Report an Issue'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Screenshot section */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {isPl ? 'Zrzut ekranu (opcjonalnie)' : 'Screenshot (optional)'}
            </label>

            {screenshot ? (
              <div className="space-y-2">
                <div className="relative border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full cursor-crosshair touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={clearAnnotations}
                      className="px-2 py-1 text-xs bg-white/90 dark:bg-neutral-800/90 rounded shadow hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                      title={isPl ? 'Wyczyść rysunki' : 'Clear drawings'}
                    >
                      🔄
                    </button>
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="px-2 py-1 text-xs bg-white/90 dark:bg-neutral-800/90 rounded shadow hover:bg-white dark:hover:bg-neutral-700 transition-colors text-red-500"
                      title={isPl ? 'Usuń zrzut' : 'Remove screenshot'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {isPl ? '✏️ Rysuj na zrzucie, aby zaznczyć problem' : '✏️ Draw on the screenshot to highlight the issue'}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={captureScreenshot}
                className="w-full py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                📸 {isPl ? 'Zrób zrzut ekranu' : 'Capture Screenshot'}
              </button>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {isPl ? 'Kategoria' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {isPl ? cat.labelPl : cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {isPl ? 'Opis problemu *' : 'Describe the issue *'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isPl ? 'Opisz co się stało, co oczekiwałeś i co faktycznie zobaczyłeś...' : 'What happened? What did you expect? What did you actually see?'}
              rows={4}
              maxLength={5000}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-neutral-400 mt-1">{description.length}/5000</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {isPl ? 'Twoje imię' : 'Your name'}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isPl ? 'Jak się nazywasz?' : 'Who are you?'}
              maxLength={100}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Auto-collected info notice */}
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {isPl
              ? '📊 Automatycznie zbieramy: URL strony, rozmiar okna, przeglądarkę i ostatnie błędy konsoli.'
              : '📊 We auto-collect: page URL, viewport size, browser info, and recent console errors.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {isPl ? 'Anuluj' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || description.trim().length < 10}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isPl ? 'Wysyłanie...' : 'Sending...'}
              </>
            ) : (
              isPl ? '📤 Wyślij' : '📤 Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
