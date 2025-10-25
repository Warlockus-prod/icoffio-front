'use client';

import { useState, useEffect, useCallback } from 'react';

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

const CONSENT_KEY = 'icoffio_cookie_consent';
const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 365;

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

  // Загрузка сохраненных настроек при монтировании
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      
      if (saved) {
        const parsed: ConsentState & { version?: string; expiryDate?: number } = JSON.parse(saved);
        
        // Проверяем версию и срок действия
        const isExpired = parsed.expiryDate && parsed.expiryDate < Date.now();
        const isOldVersion = parsed.version !== CONSENT_VERSION;
        
        if (isExpired || isOldVersion) {
          // Сбрасываем устаревшее согласие
          localStorage.removeItem(CONSENT_KEY);
          setShowBanner(true);
        } else {
          // Восстанавливаем сохраненные настройки
          setConsentState({
            hasConsented: parsed.hasConsented,
            timestamp: parsed.timestamp,
            preferences: { ...defaultPreferences, ...parsed.preferences },
          });
          setShowBanner(!parsed.hasConsented);
        }
      } else {
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Cookie Consent: Ошибка загрузки настроек', error);
      setShowBanner(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Сохранение настроек в localStorage
  const saveConsent = useCallback((preferences: CookiePreferences) => {
    const newState: ConsentState = {
      hasConsented: true,
      timestamp: Date.now(),
      preferences,
    };

    const expiryDate = Date.now() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          ...newState,
          version: CONSENT_VERSION,
          expiryDate,
        })
      );
      setConsentState(newState);
      setShowBanner(false);

      // Триггерим событие для других компонентов
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
        detail: preferences 
      }));

      // Перезагружаем страницу если разрешили аналитику/рекламу
      if (preferences.analytics || preferences.advertising) {
        window.location.reload();
      }
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

