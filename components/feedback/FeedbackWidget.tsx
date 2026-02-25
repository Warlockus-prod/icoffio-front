'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load the modal — html2canvas is only imported when modal opens
const FeedbackModal = dynamic(
  () => import('./FeedbackModal').then(mod => ({ default: mod.FeedbackModal })),
  { ssr: false }
);

interface FeedbackWidgetProps {
  locale?: string;
}

export function FeedbackWidget({ locale = 'en' }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        aria-label={locale === 'pl' ? 'Zgłoś problem' : 'Report an issue'}
        title={locale === 'pl' ? 'Zgłoś problem' : 'Report an issue'}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110"
      >
        <svg
          className="w-6 h-6 transition-transform group-hover:rotate-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <FeedbackModal isOpen={isOpen} onClose={handleClose} locale={locale} />
      )}
    </>
  );
}
