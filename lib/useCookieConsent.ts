'use client';

import { useState, useEffect, useCallback } from 'react';
import { CONSENT_KEY, CONSENT_VERSION, consentExpiryMs, readStoredConsent } from '@/lib/consent-storage';

export type CookieCategory = 'necessary' | 'analytics' | 'advertising';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  advertising: boolean;
}

export interface ConsentState {
  hasConsented: boolean;
  timestamp?: number;
  preferences: CookiePreferences;
}

// Storage key, version and expiry rules live in lib/consent-storage.ts — the
// <head> loader in layout.tsx reads the same record before React hydrates.

// Значения по умолчанию
const defaultPreferences: CookiePreferences = {
  necessary: true,  // Всегда включено
  analytics: false,
  advertising: false,
};

/**
 * Hook для управления Cookie Consent
 * 
 * Возможности:
 * - Сохранение выбора пользователя в localStorage
 * - Автоматическая проверка срока действия согласия
 * - GDPR compliant
 * - Блокировка скриптов до получения согласия
 */
export function useCookieConsent() {
  const [consentState, setConsentState] = useState<ConsentState>({
    hasConsented: false,
    preferences: defaultPreferences,
  });
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Чтение сохранённых настроек. Вызывается при монтировании и при каждом
  // изменении согласия — у каждого компонента свой экземпляр этого хука, так
  // что выбор в баннере доходит до AdManager и остальных только через события.
  // Раньше это делала перезагрузка страницы.
  const readConsent = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      const stored = readStoredConsent(raw);

      if (raw && !stored) {
        // Устаревшая версия или истёкший срок — спрашиваем заново
        localStorage.removeItem(CONSENT_KEY);
      }

      if (stored) {
        setConsentState({
          hasConsented: stored.hasConsented,
          timestamp: stored.timestamp,
          preferences: { ...defaultPreferences, ...stored.preferences },
        });
        setShowBanner(!stored.hasConsented);
      } else {
        setConsentState({ hasConsented: false, preferences: defaultPreferences });
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Cookie Consent: Ошибка загрузки настроек', error);
      setShowBanner(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    readConsent();

    const onChanged = () => readConsent();
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CONSENT_KEY) return;
      readConsent();
    };
    window.addEventListener('cookieConsentChanged', onChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cookieConsentChanged', onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [readConsent]);

  // Сохранение настроек в localStorage
  const saveConsent = useCallback((preferences: CookiePreferences) => {
    const newState: ConsentState = {
      hasConsented: true,
      timestamp: Date.now(),
      preferences,
    };

    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          ...newState,
          version: CONSENT_VERSION,
          // Согласие — на год, отказ — на месяц (см. lib/consent-storage.ts)
          expiryDate: consentExpiryMs(preferences),
        })
      );
      setConsentState(newState);
      setShowBanner(false);

      // Все остальные экземпляры хука (AdManager, Analytics, …) перечитают
      // localStorage по этому событию — перезагрузка страницы больше не нужна.
      // v10.23.2: раньше reload стоил ~2 с и сбрасывал позицию прокрутки на
      // единственном pageview, где пользователь только что дал согласие.
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: preferences
      }));
    } catch (error) {
      console.error('Cookie Consent: Ошибка сохранения настроек', error);
    }
  }, []);

  // Принять все cookies
  const acceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: true,
      advertising: true,
    });
  }, [saveConsent]);

  // Отклонить все (кроме необходимых)
  const rejectAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: false,
      advertising: false,
    });
  }, [saveConsent]);

  // Сохранить выборочные настройки
  const saveCustomPreferences = useCallback(
    (preferences: CookiePreferences) => {
      saveConsent({
        ...preferences,
        necessary: true, // Necessary всегда true
      });
    },
    [saveConsent]
  );

  // Сброс согласия (для тестирования или по запросу пользователя)
  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsentState({
      hasConsented: false,
      preferences: defaultPreferences,
    });
    setShowBanner(true);
  }, []);

  // Проверка разрешения для конкретной категории
  const hasConsent = useCallback(
    (category: CookieCategory): boolean => {
      return consentState.hasConsented && consentState.preferences[category];
    },
    [consentState]
  );

  return {
    // Состояние
    consentState,
    showBanner,
    isLoading,
    
    // Методы
    acceptAll,
    rejectAll,
    saveCustomPreferences,
    resetConsent,
    hasConsent,
    
    // Для ручного управления баннером
    setShowBanner,
  };
}

/**
 * Утилита для проверки consent из любого места
 * (без использования hook)
 */
export function checkCookieConsent(category: CookieCategory): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (!saved) return false;

    const parsed: ConsentState = JSON.parse(saved);
    return parsed.hasConsented && parsed.preferences[category];
  } catch {
    return false;
  }
}


