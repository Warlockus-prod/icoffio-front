'use client';

import Link from "next/link";
import { getTranslation } from "@/lib/i18n";
import { useState } from "react";

interface FooterProps {
  locale?: string;
}

export function Footer({ locale = 'en' }: FooterProps = {}) {
  const t = getTranslation(locale);
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  const handleCookieSettings = () => {
    // Trigger event to open cookie settings modal
    window.dispatchEvent(new CustomEvent('openCookieSettings'));
  };

  return (
    <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 py-12">

        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand section */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="font-bold text-xl text-neutral-900 dark:text-neutral-100">icoffio</span>
            </Link>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 max-w-sm">
              {t.coveringTechEvents}
            </p>
          </div>

          {/* About section */}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t.about}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}/editorial`} className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  {t.editorial}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/advertising`} className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  {t.advertising}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal section */}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {locale === 'en' && 'Legal'}
              {locale === 'ru' && 'Правовая информация'}
              {locale === 'pl' && 'Informacje prawne'}
              {locale === 'de' && 'Rechtliches'}
              {locale === 'es' && 'Legal'}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}/privacy`} className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  {locale === 'en' && 'Privacy Policy'}
                  {locale === 'ru' && 'Политика конфиденциальности'}
                  {locale === 'pl' && 'Polityka prywatności'}
                  {locale === 'de' && 'Datenschutz'}
                  {locale === 'es' && 'Política de privacidad'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/cookies`} className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  {locale === 'en' && 'Cookie Policy'}
                  {locale === 'ru' && 'Политика cookies'}
                  {locale === 'pl' && 'Polityka plików cookie'}
                  {locale === 'de' && 'Cookie-Richtlinie'}
                  {locale === 'es' && 'Política de cookies'}
                </Link>
              </li>
              <li>
                <button
                  onClick={handleCookieSettings}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors text-left"
                >
                  🍪 {locale === 'en' && 'Cookie Settings'}
                  {locale === 'ru' && 'Настройки cookies'}
                  {locale === 'pl' && 'Ustawienia plików cookie'}
                  {locale === 'de' && 'Cookie-Einstellungen'}
                  {locale === 'es' && 'Configuración de cookies'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-neutral-500 dark:text-neutral-400 text-sm">
              {t.allRightsReservedFull}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}