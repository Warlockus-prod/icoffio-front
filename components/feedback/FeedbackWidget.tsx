'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPl = locale === 'pl';

  // Check existing admin session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/auth', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json();
        if (data?.success && data?.authenticated) {
          setIsAuthenticated(true);
        }
      } catch {
        // silently fail — not authenticated
      } finally {
        setIsCheckingAuth(false);
      }
    })();
  }, []);

  // Close login popup on outside click
  useEffect(() => {
    if (!showLogin) return;
    const handler = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setShowLogin(false);
        setLoginError('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLogin]);

  // Focus input when login popup opens
  useEffect(() => {
    if (showLogin && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showLogin]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'password_login', password }),
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setShowLogin(false);
        setPassword('');
        setLoginError('');
      } else {
        setLoginError(isPl ? 'Nieprawidłowe hasło' : 'Invalid password');
      }
    } catch {
      setLoginError(isPl ? 'Błąd połączenia' : 'Connection error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Don't render anything while checking auth
  if (isCheckingAuth) return null;

  return (
    <>
      {isAuthenticated ? (
        /* ── Authenticated: Bug report button ── */
        <button
          onClick={handleOpen}
          aria-label={isPl ? 'Zgłoś problem' : 'Report an issue'}
          title={isPl ? 'Zgłoś problem' : 'Report an issue'}
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
      ) : (
        /* ── Not authenticated: small key icon ── */
        <div className="fixed bottom-5 right-5 z-40" ref={loginRef}>
          <button
            onClick={() => setShowLogin(prev => !prev)}
            aria-label={isPl ? 'Zaloguj się jako tester' : 'Sign in as tester'}
            title={isPl ? 'Zaloguj się jako tester' : 'Sign in as tester'}
            className="w-9 h-9 bg-neutral-200/80 dark:bg-neutral-700/80 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-500 dark:text-neutral-400 rounded-full shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center backdrop-blur-sm hover:scale-110"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </button>

          {/* Login popup */}
          {showLogin && (
            <div className="absolute bottom-12 right-0 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-4 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-3">
                {isPl ? '🔑 Zaloguj się do testowania' : '🔑 Sign in to report bugs'}
              </p>
              <form onSubmit={handleLogin}>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isPl ? 'Hasło admina' : 'Admin password'}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="current-password"
                />
                {loginError && (
                  <p className="text-xs text-red-500 mt-1.5">{loginError}</p>
                )}
                <button
                  type="submit"
                  disabled={isLoggingIn || !password.trim()}
                  className="w-full mt-2.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isLoggingIn
                    ? (isPl ? 'Logowanie...' : 'Signing in...')
                    : (isPl ? 'Zaloguj' : 'Sign In')}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {isOpen && isAuthenticated && (
        <FeedbackModal isOpen={isOpen} onClose={handleClose} locale={locale} />
      )}
    </>
  );
}
