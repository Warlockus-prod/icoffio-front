'use client';

import { useEffect, useState } from 'react';
import { CookieSettings } from './CookieSettings';

interface CookieSettingsManagerProps {
  locale: string;
}

/**
 * Global manager that listens for 'openCookieSettings' event
 * and displays the Cookie Settings modal.
 * 
 * This allows any component (like Footer) to open cookie settings
 * by dispatching a custom event:
 * 
 * window.dispatchEvent(new CustomEvent('openCookieSettings'));
 */
export function CookieSettingsManager({ locale }: CookieSettingsManagerProps) {
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
    };

    window.addEventListener('openCookieSettings', handleOpenSettings);

    return () => {
      window.removeEventListener('openCookieSettings', handleOpenSettings);
    };
  }, []);

  if (!showSettings) {
    return null;
  }

  return (
    <CookieSettings
      locale={locale}
      onClose={() => setShowSettings(false)}
    />
  );
}








