'use client';

import { useState } from 'react';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { CookieSettings } from '@/components/CookieSettings';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface CookieConsentProps {
  locale: string;
}

// Переводы для баннера
const translations: Record<string, {
  title: string;
  description: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  privacyPolicy: string;
  cookiePolicy: string;
}> = {
  en: {
    title: '🍪 We use cookies',
    description: 'We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
    acceptAll: 'Accept All',
    rejectAll: 'Reject All',
    customize: 'Customize',
    privacyPolicy: 'Privacy Policy',
    cookiePolicy: 'Cookie Policy',
  },
  ru: {
    title: '🍪 Мы используем cookies',
    description: 'Мы используем cookies для улучшения вашего опыта, показа персонализированной рекламы и анализа трафика. Нажимая "Принять все", вы соглашаетесь на использование cookies.',
    acceptAll: 'Принять все',
    rejectAll: 'Отклонить все',
    customize: 'Настроить',
    privacyPolicy: 'Политика конфиденциальности',
    cookiePolicy: 'Политика cookies',
  },
  pl: {
    title: '🍪 Używamy plików cookie',
    description: 'Używamy plików cookie, aby poprawić Twoje wrażenia z przeglądania, wyświetlać spersonalizowane reklamy i analizować ruch. Klikając "Zaakceptuj wszystko", wyrażasz zgodę na użycie plików cookie.',
    acceptAll: 'Zaakceptuj wszystko',
    rejectAll: 'Odrzuć wszystko',
    customize: 'Dostosuj',
    privacyPolicy: 'Polityka prywatności',
    cookiePolicy: 'Polityka plików cookie',
  },
  de: {
    title: '🍪 Wir verwenden Cookies',
    description: 'Wir verwenden Cookies, um Ihr Surferlebnis zu verbessern, personalisierte Werbung anzuzeigen und unseren Traffic zu analysieren. Durch Klicken auf "Alle akzeptieren" stimmen Sie der Verwendung von Cookies zu.',
    acceptAll: 'Alle akzeptieren',
    rejectAll: 'Alle ablehnen',
    customize: 'Anpassen',
    privacyPolicy: 'Datenschutz',
    cookiePolicy: 'Cookie-Richtlinie',
  },
  es: {
    title: '🍪 Usamos cookies',
    description: 'Utilizamos cookies para mejorar su experiencia de navegación, mostrar anuncios personalizados y analizar nuestro tráfico. Al hacer clic en "Aceptar todo", usted acepta el uso de cookies.',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar todo',
    customize: 'Personalizar',
    privacyPolicy: 'Política de privacidad',
    cookiePolicy: 'Política de cookies',
  },
};

export function CookieConsent({ locale = 'en' }: CookieConsentProps) {
  const { showBanner, acceptAll, rejectAll } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  // v10.18.0: WCAG focus trap for the consent dialog
  const dialogRef = useFocusTrap<HTMLDivElement>(showBanner && !showSettings);

  const t = translations[locale] || translations.en;

  // Не показываем баннер если пользователь уже дал согласие
  if (!showBanner) return null;

  // Если открыто модальное окно настроек, показываем его
  if (showSettings) {
    return <CookieSettings locale={locale} onClose={() => setShowSettings(false)} />;
  }

  return (
    <>
      {/* Overlay для затемнения фона */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        aria-hidden="true"
      />

      {/* Cookie Banner */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 animate-in slide-in-from-bottom duration-500"
      >
        <div className="mx-auto max-w-6xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Текстовая часть */}
              <div className="flex-1">
                <h2 
                  id="cookie-consent-title"
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-3"
                >
                  {t.title}
                </h2>
                <p 
                  id="cookie-consent-description"
                  className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4"
                >
                  {t.description}
                </p>
                
                {/* Ссылки на политики */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <a
                    href={`/${locale}/privacy`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    {t.privacyPolicy}
                  </a>
                  <a
                    href={`/${locale}/cookies`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    {t.cookiePolicy}
                  </a>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[200px]">
                <button
                  onClick={acceptAll}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  {t.acceptAll}
                </button>
                
                <button
                  onClick={rejectAll}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  {t.rejectAll}
                </button>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-600 dark:hover:border-indigo-400 text-gray-900 dark:text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  {t.customize}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

