'use client';

import { useState } from 'react';
import { useCookieConsent, CookiePreferences } from '@/lib/useCookieConsent';

interface CookieSettingsProps {
  locale: string;
  onClose: () => void;
}

// Переводы для модального окна настроек
const translations: Record<string, {
  title: string;
  description: string;
  necessary: {
    title: string;
    description: string;
    always: string;
  };
  analytics: {
    title: string;
    description: string;
  };
  advertising: {
    title: string;
    description: string;
  };
  saveSettings: string;
  acceptAll: string;
  rejectAll: string;
}> = {
  en: {
    title: 'Cookie Settings',
    description: 'We use different types of cookies to optimize your experience on our website. Click on the categories below to learn more and change our default settings. Note that blocking some types of cookies may impact your experience.',
    necessary: {
      title: 'Necessary Cookies',
      description: 'These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt-out of these cookies.',
      always: 'Always Active',
    },
    analytics: {
      title: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. We use Google Analytics to track page views, user behavior, and site performance.',
    },
    advertising: {
      title: 'Advertising Cookies',
      description: 'These cookies are used to deliver advertisements more relevant to you and your interests. They may also be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns.',
    },
    saveSettings: 'Save Settings',
    acceptAll: 'Accept All',
    rejectAll: 'Reject All',
  },
  ru: {
    title: 'Настройки Cookie',
    description: 'Мы используем различные типы cookies для оптимизации вашего опыта на нашем сайте. Нажмите на категории ниже, чтобы узнать больше и изменить настройки по умолчанию. Обратите внимание, что блокировка некоторых cookies может повлиять на ваш опыт.',
    necessary: {
      title: 'Необходимые Cookie',
      description: 'Эти cookies необходимы для правильной работы сайта. Они обеспечивают основные функции, такие как безопасность, управление сетью и доступность. Вы не можете отключить эти cookies.',
      always: 'Всегда активно',
    },
    analytics: {
      title: 'Аналитические Cookie',
      description: 'Эти cookies помогают нам понять, как посетители взаимодействуют с нашим сайтом, собирая и анализируя информацию анонимно. Мы используем Google Analytics для отслеживания просмотров страниц, поведения пользователей и производительности сайта.',
    },
    advertising: {
      title: 'Рекламные Cookie',
      description: 'Эти cookies используются для показа более релевантной рекламы, соответствующей вашим интересам. Они также могут использоваться для ограничения количества показов рекламы и измерения эффективности рекламных кампаний.',
    },
    saveSettings: 'Сохранить настройки',
    acceptAll: 'Принять все',
    rejectAll: 'Отклонить все',
  },
  pl: {
    title: 'Ustawienia plików cookie',
    description: 'Używamy różnych typów plików cookie, aby zoptymalizować Twoje doświadczenia na naszej stronie. Kliknij poniższe kategorie, aby dowiedzieć się więcej i zmienić nasze domyślne ustawienia. Pamiętaj, że blokowanie niektórych typów plików cookie może wpłynąć na Twoje wrażenia.',
    necessary: {
      title: 'Niezbędne pliki cookie',
      description: 'Te pliki cookie są niezbędne do prawidłowego działania witryny. Umożliwiają podstawowe funkcje, takie jak bezpieczeństwo, zarządzanie siecią i dostępność. Nie możesz zrezygnować z tych plików cookie.',
      always: 'Zawsze aktywne',
    },
    analytics: {
      title: 'Pliki cookie analityczne',
      description: 'Te pliki cookie pomagają nam zrozumieć, jak odwiedzający wchodzą w interakcję z naszą stroną, gromadząc i raportując informacje anonimowo. Używamy Google Analytics do śledzenia wyświetleń stron, zachowań użytkowników i wydajności witryny.',
    },
    advertising: {
      title: 'Pliki cookie reklamowe',
      description: 'Te pliki cookie są używane do dostarczania reklam bardziej odpowiednich dla Ciebie i Twoich zainteresowań. Mogą być również używane do ograniczenia liczby wyświetleń reklamy i mierzenia skuteczności kampanii reklamowych.',
    },
    saveSettings: 'Zapisz ustawienia',
    acceptAll: 'Zaakceptuj wszystko',
    rejectAll: 'Odrzuć wszystko',
  },
  de: {
    title: 'Cookie-Einstellungen',
    description: 'Wir verwenden verschiedene Arten von Cookies, um Ihr Erlebnis auf unserer Website zu optimieren. Klicken Sie auf die Kategorien unten, um mehr zu erfahren und unsere Standardeinstellungen zu ändern. Beachten Sie, dass das Blockieren einiger Cookie-Typen Ihr Erlebnis beeinträchtigen kann.',
    necessary: {
      title: 'Notwendige Cookies',
      description: 'Diese Cookies sind für das ordnungsgemäße Funktionieren der Website unerlässlich. Sie ermöglichen Kernfunktionen wie Sicherheit, Netzwerkverwaltung und Zugänglichkeit. Sie können diese Cookies nicht deaktivieren.',
      always: 'Immer aktiv',
    },
    analytics: {
      title: 'Analyse-Cookies',
      description: 'Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem sie Informationen anonym sammeln und melden. Wir verwenden Google Analytics, um Seitenaufrufe, Nutzerverhalten und Website-Leistung zu verfolgen.',
    },
    advertising: {
      title: 'Werbe-Cookies',
      description: 'Diese Cookies werden verwendet, um Ihnen relevantere Werbung zu liefern, die Ihren Interessen entspricht. Sie können auch verwendet werden, um die Anzahl der Anzeigenaufrufe zu begrenzen und die Wirksamkeit von Werbekampagnen zu messen.',
    },
    saveSettings: 'Einstellungen speichern',
    acceptAll: 'Alle akzeptieren',
    rejectAll: 'Alle ablehnen',
  },
  es: {
    title: 'Configuración de cookies',
    description: 'Utilizamos diferentes tipos de cookies para optimizar su experiencia en nuestro sitio web. Haga clic en las categorías a continuación para obtener más información y cambiar nuestra configuración predeterminada. Tenga en cuenta que bloquear algunos tipos de cookies puede afectar su experiencia.',
    necessary: {
      title: 'Cookies necesarias',
      description: 'Estas cookies son esenciales para que el sitio web funcione correctamente. Permiten funciones básicas como seguridad, gestión de red y accesibilidad. No puede optar por no usar estas cookies.',
      always: 'Siempre activo',
    },
    analytics: {
      title: 'Cookies de análisis',
      description: 'Estas cookies nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web recopilando e informando información de forma anónima. Utilizamos Google Analytics para rastrear vistas de página, comportamiento del usuario y rendimiento del sitio.',
    },
    advertising: {
      title: 'Cookies publicitarias',
      description: 'Estas cookies se utilizan para ofrecer publicidad más relevante para usted y sus intereses. También pueden usarse para limitar la cantidad de veces que ve un anuncio y medir la efectividad de las campañas publicitarias.',
    },
    saveSettings: 'Guardar configuración',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar todo',
  },
};

export function CookieSettings({ locale = 'en', onClose }: CookieSettingsProps) {
  const { consentState, acceptAll, rejectAll, saveCustomPreferences } = useCookieConsent();
  
  // Локальное состояние для настроек (до сохранения)
  const [preferences, setPreferences] = useState<CookiePreferences>(
    consentState.preferences
  );

  const t = translations[locale] || translations.en;

  const handleToggle = (category: 'analytics' | 'advertising') => {
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = () => {
    saveCustomPreferences(preferences);
    onClose();
  };

  const handleAcceptAll = () => {
    acceptAll();
    onClose();
  };

  const handleRejectAll = () => {
    rejectAll();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="cookie-settings-title"
        aria-modal="true"
        className="fixed inset-x-4 top-[50%] translate-y-[-50%] sm:inset-x-auto sm:left-[50%] sm:translate-x-[-50%] w-auto sm:max-w-2xl z-[9999] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 
                id="cookie-settings-title"
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {t.title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {t.description}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              {/* Necessary Cookies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t.necessary.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {t.necessary.description}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">
                      {t.necessary.always}
                    </span>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t.analytics.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {t.analytics.description}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => handleToggle('analytics')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        preferences.analytics ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={preferences.analytics}
                      aria-label="Toggle analytics cookies"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Advertising Cookies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t.advertising.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {t.advertising.description}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => handleToggle('advertising')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        preferences.advertising ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={preferences.advertising}
                      aria-label="Toggle advertising cookies"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.advertising ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                {t.saveSettings}
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-all duration-200"
              >
                {t.acceptAll}
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-all duration-200"
              >
                {t.rejectAll}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

