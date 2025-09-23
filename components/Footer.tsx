import Link from "next/link";
import { Newsletter } from "./Newsletter";
import { getTranslation } from "@/lib/i18n";

interface FooterProps {
  locale?: string;
}

export function Footer({ locale = 'en' }: FooterProps = {}) {
  const t = getTranslation(locale);
  return (
    <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Newsletter Section */}
        <div className="mb-12">
          <Newsletter locale={locale} />
        </div>

        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="md:col-span-2">
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

          {/* Newsletter section */}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">📬 {t.followUs}</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-3">
              Подпишитесь на нашу рассылку, чтобы получать самые актуальные новости технологий
            </p>
            <div className="text-neutral-500 dark:text-neutral-500 text-xs">
              Социальные сети появятся в ближайшее время
            </div>
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