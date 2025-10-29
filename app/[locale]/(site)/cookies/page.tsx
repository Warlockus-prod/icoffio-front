import { Metadata } from 'next';
import Link from 'next/link';

interface CookiesPageProps {
  params: {
    locale: string;
  };
}

const translations: Record<string, {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Array<{
    title: string;
    content: string[];
  }>;
}> = {
  en: {
    title: 'Cookie Policy',
    lastUpdated: 'Last updated: October 25, 2025',
    intro: 'This Cookie Policy explains how icoffio.com uses cookies and similar tracking technologies when you visit our website. By continuing to use our website, you consent to our use of cookies in accordance with this policy.',
    sections: [
      {
        title: '1. What Are Cookies?',
        content: [
          'Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences and improve your browsing experience.',
          '',
          'Cookies can be:',
          '• **Session cookies**: Temporary cookies deleted when you close your browser',
          '• **Persistent cookies**: Stored on your device for a set period or until you delete them'
        ]
      },
      {
        title: '2. Types of Cookies We Use',
        content: [
          '**2.1. Necessary Cookies (Always Active)**',
          'These cookies are essential for the website to function properly. They enable basic features like:',
          '• Theme preferences (light/dark mode)',
          '• Language selection',
          '• Cookie consent settings',
          '• Security and fraud prevention',
          '',
          'You cannot opt out of these cookies as they are necessary for the website to work.',
          '',
          '**2.2. Analytics Cookies (Optional)**',
          'We use Google Analytics to understand how visitors interact with our website:',
          '• **Provider**: Google LLC',
          '• **Purpose**: Website analytics and performance monitoring',
          '• **Data collected**: Page views, session duration, bounce rate, browser type, device information, anonymized IP addresses',
          '• **Retention**: 26 months',
          '• **Google Analytics ID**: G-35P327PYGH',
          '',
          'These cookies help us improve our website and user experience.',
          '',
          '**2.3. Advertising Cookies (Optional)**',
          'We use VOX advertising platform to display relevant ads:',
          '• **Provider**: VOX (Malware.Expert WAF)',
          '• **Purpose**: Display contextual and behavioral advertising',
          '• **Types**: In-Image ads, Display ads (728x90, 970x250, 300x250, 300x600, 160x600, 320x50, 320x100, 320x480)',
          '• **Data collected**: Browsing behavior, ad interactions, device information',
          '',
          'These cookies help us monetize the website and keep our content free.'
        ]
      },
      {
        title: '3. Third-Party Cookies',
        content: [
          'Some cookies are set by third-party services we use:',
          '',
          '**Google Analytics**',
          '• Domain: `.google-analytics.com`',
          '• Purpose: Website analytics',
          '• Privacy Policy: https://policies.google.com/privacy',
          '',
          '**VOX Advertising**',
          '• Domain: Various ad domains',
          '• Purpose: Ad delivery and tracking',
          '• Privacy Policy: Check VOX/Malware.Expert documentation',
          '',
          '**WordPress (Content Management)**',
          '• Domain: `icoffio.com`',
          '• Purpose: Content delivery and caching',
          '',
          'These third-party services may use their own cookies according to their privacy policies.'
        ]
      },
      {
        title: '4. How to Manage Cookies',
        content: [
          'You have several options to control cookies:',
          '',
          '**4.1. Cookie Settings on Our Website**',
          'Click the "Cookie Settings" button in the website footer to:',
          '• Accept all cookies',
          '• Reject optional cookies (Analytics and Advertising)',
          '• Customize your preferences',
          '',
          '**4.2. Browser Settings**',
          'You can configure your browser to:',
          '• Block all cookies',
          '• Block third-party cookies only',
          '• Delete cookies after each session',
          '• Receive notifications before cookies are set',
          '',
          'Instructions for popular browsers:',
          '• **Chrome**: Settings → Privacy and security → Cookies',
          '• **Firefox**: Settings → Privacy & Security → Cookies',
          '• **Safari**: Preferences → Privacy → Cookies',
          '• **Edge**: Settings → Cookies and site permissions',
          '',
          '⚠️ **Note**: Disabling necessary cookies may affect website functionality.'
        ]
      },
      {
        title: '5. Cookie Retention Periods',
        content: [
          'Different cookies have different lifespans:',
          '',
          '• **Necessary cookies**: Session cookies (deleted on browser close) or 365 days',
          '• **Cookie consent**: 365 days',
          '• **Theme preferences**: 365 days',
          '• **Language preferences**: 365 days',
          '• **Google Analytics**: 26 months',
          '• **VOX Advertising**: Varies by ad network'
        ]
      },
      {
        title: '6. Do Not Track (DNT)',
        content: [
          'Some browsers have a "Do Not Track" (DNT) feature that signals websites that you don\'t want to be tracked.',
          '',
          'Currently, there is no universal standard for how websites should respond to DNT signals. We respect your privacy choices through our cookie consent banner, which allows you to opt out of analytics and advertising cookies.'
        ]
      },
      {
        title: '7. Updates to This Policy',
        content: [
          'We may update this Cookie Policy from time to time to reflect changes in:',
          '• Cookie technologies we use',
          '• Legal requirements',
          '• Our services and features',
          '',
          'When we make significant changes, we will:',
          '• Update the "Last Updated" date at the top of this page',
          '• Request your consent again if required by law',
          '',
          'We recommend checking this page periodically for updates.'
        ]
      },
      {
        title: '8. Contact Us',
        content: [
          'If you have questions about our use of cookies, please contact us:',
          '',
          '**Email**: gtframestudioai@gmail.com',
          '**Website**: icoffio.com',
          '**Address**: Warsaw, Poland',
          '**Region**: European Union',
          '',
          'For general privacy inquiries, see our Privacy Policy.'
        ]
      }
    ]
  },
  
  pl: {
    title: 'Polityka plików cookie',
    lastUpdated: 'Ostatnia aktualizacja: 25 października 2025',
    intro: 'Niniejsza Polityka plików cookie wyjaśnia, jak icoffio.com wykorzystuje pliki cookie i podobne technologie śledzenia podczas odwiedzania naszej witryny. Kontynuując korzystanie z naszej witryny, wyrażasz zgodę na używanie plików cookie zgodnie z niniejszą polityką.',
    sections: [
      {
        title: '1. Czym są pliki cookie?',
        content: [
          'Pliki cookie to małe pliki tekstowe przechowywane na Twoim urządzeniu (komputerze, tablecie lub telefonie komórkowym) podczas odwiedzania witryny. Pomagają stronom internetowym zapamiętywać Twoje preferencje i poprawiać doświadczenie przeglądania.',
          '',
          'Pliki cookie mogą być:',
          '• **Pliki cookie sesji**: Tymczasowe pliki cookie usuwane po zamknięciu przeglądarki',
          '• **Trwałe pliki cookie**: Przechowywane na urządzeniu przez określony czas lub do momentu ich usunięcia'
        ]
      },
      {
        title: '2. Rodzaje plików cookie, których używamy',
        content: [
          '**2.1. Niezbędne pliki cookie (Zawsze aktywne)**',
          'Te pliki cookie są niezbędne do prawidłowego funkcjonowania witryny. Umożliwiają podstawowe funkcje:',
          '• Preferencje motywu (jasny/ciemny)',
          '• Wybór języka',
          '• Ustawienia zgody na pliki cookie',
          '• Bezpieczeństwo i zapobieganie oszustwom',
          '',
          'Nie możesz zrezygnować z tych plików cookie, ponieważ są niezbędne do działania witryny.',
          '',
          '**2.2. Pliki cookie analityczne (Opcjonalne)**',
          'Używamy Google Analytics, aby zrozumieć, jak odwiedzający wchodzą w interakcję z naszą witryną:',
          '• **Dostawca**: Google LLC',
          '• **Cel**: Analityka witryny i monitorowanie wydajności',
          '• **Zbierane dane**: Wyświetlenia stron, czas trwania sesji, współczynnik odrzuceń, typ przeglądarki, informacje o urządzeniu, zanonimizowane adresy IP',
          '• **Przechowywanie**: 26 miesięcy',
          '• **Google Analytics ID**: G-35P327PYGH',
          '',
          'Te pliki cookie pomagają nam ulepszać naszą witrynę i doświadczenie użytkownika.',
          '',
          '**2.3. Pliki cookie reklamowe (Opcjonalne)**',
          'Używamy platformy reklamowej VOX do wyświetlania trafnych reklam:',
          '• **Dostawca**: VOX (Malware.Expert WAF)',
          '• **Cel**: Wyświetlanie reklam kontekstowych i behawioralnych',
          '• **Typy**: Reklamy In-Image, reklamy Display (728x90, 970x250, 300x250, 300x600, 160x600, 320x50, 320x100, 320x480)',
          '• **Zbierane dane**: Zachowanie przeglądania, interakcje z reklamami, informacje o urządzeniu',
          '',
          'Te pliki cookie pomagają nam monetyzować witrynę i utrzymywać treść bezpłatną.'
        ]
      },
      {
        title: '3. Pliki cookie stron trzecich',
        content: [
          'Niektóre pliki cookie są ustawiane przez usługi stron trzecich, z których korzystamy:',
          '',
          '**Google Analytics**',
          '• Domena: `.google-analytics.com`',
          '• Cel: Analityka witryny',
          '• Polityka prywatności: https://policies.google.com/privacy',
          '',
          '**Reklama VOX**',
          '• Domena: Różne domeny reklamowe',
          '• Cel: Dostarczanie i śledzenie reklam',
          '• Polityka prywatności: Zobacz dokumentację VOX/Malware.Expert',
          '',
          '**WordPress (Zarządzanie treścią)**',
          '• Domena: `icoffio.com`',
          '• Cel: Dostarczanie treści i buforowanie',
          '',
          'Te usługi stron trzecich mogą używać własnych plików cookie zgodnie z ich politykami prywatności.'
        ]
      },
      {
        title: '4. Jak zarządzać plikami cookie',
        content: [
          'Masz kilka opcji kontrolowania plików cookie:',
          '',
          '**4.1. Ustawienia plików cookie na naszej witrynie**',
          'Kliknij przycisk "Ustawienia plików cookie" w stopce witryny, aby:',
          '• Zaakceptować wszystkie pliki cookie',
          '• Odrzucić opcjonalne pliki cookie (Analityka i Reklama)',
          '• Dostosować preferencje',
          '',
          '**4.2. Ustawienia przeglądarki**',
          'Możesz skonfigurować przeglądarkę, aby:',
          '• Blokować wszystkie pliki cookie',
          '• Blokować tylko pliki cookie stron trzecich',
          '• Usuwać pliki cookie po każdej sesji',
          '• Otrzymywać powiadomienia przed ustawieniem plików cookie',
          '',
          'Instrukcje dla popularnych przeglądarek:',
          '• **Chrome**: Ustawienia → Prywatność i bezpieczeństwo → Pliki cookie',
          '• **Firefox**: Ustawienia → Prywatność i bezpieczeństwo → Ciasteczka',
          '• **Safari**: Preferencje → Prywatność → Pliki cookie',
          '• **Edge**: Ustawienia → Pliki cookie i uprawnienia witryn',
          '',
          '⚠️ **Uwaga**: Wyłączenie niezbędnych plików cookie może wpłynąć na funkcjonalność witryny.'
        ]
      },
      {
        title: '5. Okresy przechowywania plików cookie',
        content: [
          'Różne pliki cookie mają różne okresy ważności:',
          '',
          '• **Niezbędne pliki cookie**: Pliki cookie sesji (usuwane po zamknięciu przeglądarki) lub 365 dni',
          '• **Zgoda na pliki cookie**: 365 dni',
          '• **Preferencje motywu**: 365 dni',
          '• **Preferencje językowe**: 365 dni',
          '• **Google Analytics**: 26 miesięcy',
          '• **Reklama VOX**: Różni się w zależności od sieci reklamowej'
        ]
      },
      {
        title: '6. Do Not Track (DNT)',
        content: [
          'Niektóre przeglądarki mają funkcję "Do Not Track" (DNT), która sygnalizuje witrynom, że nie chcesz być śledzony.',
          '',
          'Obecnie nie ma uniwersalnego standardu dotyczącego tego, jak witryny powinny reagować na sygnały DNT. Szanujemy Twoje wybory prywatności poprzez baner zgody na pliki cookie, który pozwala zrezygnować z plików cookie analitycznych i reklamowych.'
        ]
      },
      {
        title: '7. Aktualizacje polityki',
        content: [
          'Możemy od czasu do czasu aktualizować niniejszą Politykę plików cookie, aby odzwierciedlić zmiany w:',
          '• Technologiach plików cookie, z których korzystamy',
          '• Wymogach prawnych',
          '• Naszych usługach i funkcjach',
          '',
          'Kiedy wprowadzimy istotne zmiany, będziemy:',
          '• Aktualizować datę "Ostatnia aktualizacja" na górze tej strony',
          '• Ponownie prosić o Twoją zgodę, jeśli jest to wymagane przez prawo',
          '',
          'Zalecamy okresowe sprawdzanie tej strony pod kątem aktualizacji.'
        ]
      },
      {
        title: '8. Skontaktuj się z nami',
        content: [
          'Jeśli masz pytania dotyczące naszego wykorzystania plików cookie, skontaktuj się z nami:',
          '',
          '**Email**: gtframestudioai@gmail.com',
          '**Witryna**: icoffio.com',
          '**Adres**: Warszawa, Polska',
          '**Region**: Unia Europejska',
          '',
          'W przypadku ogólnych zapytań dotyczących prywatności zobacz naszą Politykę prywatności.'
        ]
      }
    ]
  },
  
  
};

export async function generateMetadata({ params }: CookiesPageProps): Promise<Metadata> {
  const locale = params.locale || 'en';
  const t = translations[locale] || translations.en;

  return {
    title: `${t.title} | icoffio`,
    description: t.intro.substring(0, 160),
  };
}

export default function CookiesPage({ params }: CookiesPageProps) {
  const locale = params.locale || 'en';
  const t = translations[locale] || translations.en;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {locale === 'en' && 'Back to Home'}
            {locale === 'ru' && 'Назад на главную'}
            {locale === 'pl' && 'Powrót do strony głównej'}
            {locale === 'de' && 'Zurück zur Startseite'}
            {locale === 'es' && 'Volver al inicio'}
          </Link>

          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {t.title}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t.lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {t.intro}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {t.sections.map((section, index) => (
            <section key={index} className="border-b border-neutral-200 dark:border-neutral-800 pb-8 last:border-0">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                {section.title}
              </h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                {section.content.map((paragraph, pIndex) => {
                  // Handle bullet points
                  if (paragraph.startsWith('•')) {
                    return (
                      <p key={pIndex} className="text-neutral-700 dark:text-neutral-300 ml-4">
                        {paragraph}
                      </p>
                    );
                  }
                  
                  // Handle bold text
                  if (paragraph.includes('**')) {
                    const parts = paragraph.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={pIndex} className="text-neutral-700 dark:text-neutral-300 mb-2">
                        {parts.map((part, i) => 
                          i % 2 === 1 ? (
                            <strong key={i} className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    );
                  }
                  
                  // Regular paragraph or empty line
                  return paragraph ? (
                    <p key={pIndex} className="text-neutral-700 dark:text-neutral-300 mb-2">
                      {paragraph}
                    </p>
                  ) : (
                    <div key={pIndex} className="h-2" />
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 p-6 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            {locale === 'en' && 'Questions about Cookies?'}
            {locale === 'ru' && 'Вопросы о cookies?'}
            {locale === 'pl' && 'Pytania dotyczące plików cookie?'}
            {locale === 'de' && 'Fragen zu Cookies?'}
            {locale === 'es' && '¿Preguntas sobre cookies?'}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {locale === 'en' && 'Feel free to contact us at '}
            {locale === 'ru' && 'Свяжитесь с нами по адресу '}
            {locale === 'pl' && 'Skontaktuj się z nami pod adresem '}
            {locale === 'de' && 'Kontaktieren Sie uns unter '}
            {locale === 'es' && 'Contáctenos en '}
            <a
              href="mailto:gtframestudioai@gmail.com"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              gtframestudioai@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}



