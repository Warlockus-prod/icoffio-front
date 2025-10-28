import { Metadata } from 'next';
import Link from 'next/link';

interface PrivacyPageProps {
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
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: October 25, 2025',
    intro: 'At icoffio.com, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information when you visit our website.',
    sections: [
      {
        title: '1. Information We Collect',
        content: [
          'We collect minimal information necessary to provide our services:',
          '• **Cookies**: Essential cookies for website functionality and user preferences (theme, language)',
          '• **Analytics Data**: Anonymous usage statistics through Google Analytics (page views, browser type, device information)',
          '• **IP Addresses**: Temporarily processed for security and analytics purposes'
        ]
      },
      {
        title: '2. How We Use Your Information',
        content: [
          'We use collected information to:',
          '• Provide and improve our website services',
          '• Analyze website traffic and user behavior',
          '• Remember your preferences (theme, language)',
          '• Display relevant advertising through VOX',
          '• Ensure website security and prevent abuse'
        ]
      },
      {
        title: '3. Third-Party Services',
        content: [
          'We use the following third-party services:',
          '• **Google Analytics**: For website analytics and insights',
          '• **VOX**: For displaying relevant advertisements',
          '• **WordPress**: For content management',
          '',
          'These services may collect data according to their own privacy policies. Please review their policies for more information.'
        ]
      },
      {
        title: '4. Data Retention',
        content: [
          '• **Cookies**: Stored for up to 365 days (or until you delete them)',
          '• **Analytics Data**: Google Analytics retains data for 26 months',
          '• **Preferences**: Stored in your browser\'s local storage'
        ]
      },
      {
        title: '5. Your Rights (GDPR)',
        content: [
          'If you are in the European Union, you have the right to:',
          '• Access your personal data',
          '• Request correction or deletion of your data',
          '• Withdraw consent for data processing',
          '• Object to data processing',
          '• Data portability',
          '',
          'To exercise these rights, contact us at: gtframestudioai@gmail.com'
        ]
      },
      {
        title: '6. Cookie Management',
        content: [
          'You can manage your cookie preferences at any time:',
          '• Use the Cookie Settings button in the website footer',
          '• Adjust your browser settings to block or delete cookies',
          '• Note: Disabling necessary cookies may affect website functionality'
        ]
      },
      {
        title: '7. Contact Information',
        content: [
          'For privacy-related inquiries, please contact:',
          '',
          '**Email**: gtframestudioai@gmail.com',
          '**Website**: icoffio.com',
          '**Address**: Warsaw, Poland',
          '**Region**: European Union'
        ]
      },
      {
        title: '8. Changes to This Policy',
        content: [
          'We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last Updated" date.',
          '',
          'Your continued use of the website after changes indicates acceptance of the updated policy.'
        ]
      }
    ]
  },
  
  pl: {
    title: 'Polityka prywatności',
    lastUpdated: 'Ostatnia aktualizacja: 25 października 2025',
    intro: 'W icoffio.com szanujemy Twoją prywatność i zobowiązujemy się do ochrony Twoich danych osobowych. Niniejsza polityka prywatności wyjaśnia, jak zbieramy, wykorzystujemy i chronimy Twoje informacje podczas odwiedzania naszej witryny.',
    sections: [
      {
        title: '1. Informacje, które zbieramy',
        content: [
          'Zbieramy minimalne informacje niezbędne do świadczenia naszych usług:',
          '• **Pliki cookie**: Niezbędne pliki cookie dla funkcjonalności witryny i preferencji użytkownika (motyw, język)',
          '• **Dane analityczne**: Anonimowe statystyki użytkowania przez Google Analytics (wyświetlenia stron, typ przeglądarki, informacje o urządzeniu)',
          '• **Adresy IP**: Tymczasowo przetwarzane w celach bezpieczeństwa i analitycznych'
        ]
      },
      {
        title: '2. Jak wykorzystujemy Twoje informacje',
        content: [
          'Wykorzystujemy zebrane informacje do:',
          '• Świadczenia i ulepszania naszych usług internetowych',
          '• Analizy ruchu i zachowania użytkowników',
          '• Zapamiętywania Twoich preferencji (motyw, język)',
          '• Wyświetlania trafnych reklam przez VOX',
          '• Zapewnienia bezpieczeństwa witryny i zapobiegania nadużyciom'
        ]
      },
      {
        title: '3. Usługi stron trzecich',
        content: [
          'Korzystamy z następujących usług stron trzecich:',
          '• **Google Analytics**: Do analityki i statystyk witryny',
          '• **VOX**: Do wyświetlania trafnych reklam',
          '• **WordPress**: Do zarządzania treścią',
          '',
          'Te usługi mogą zbierać dane zgodnie z własnymi politykami prywatności. Zapoznaj się z ich politykami, aby uzyskać więcej informacji.'
        ]
      },
      {
        title: '4. Przechowywanie danych',
        content: [
          '• **Pliki cookie**: Przechowywane do 365 dni (lub do czasu ich usunięcia)',
          '• **Dane analityczne**: Google Analytics przechowuje dane przez 26 miesięcy',
          '• **Preferencje**: Przechowywane w lokalnej pamięci przeglądarki'
        ]
      },
      {
        title: '5. Twoje prawa (RODO)',
        content: [
          'Jeśli znajdujesz się w Unii Europejskiej, masz prawo do:',
          '• Dostępu do swoich danych osobowych',
          '• Żądania poprawy lub usunięcia swoich danych',
          '• Wycofania zgody na przetwarzanie danych',
          '• Sprzeciwu wobec przetwarzania danych',
          '• Przenoszenia danych',
          '',
          'Aby skorzystać z tych praw, skontaktuj się z nami: gtframestudioai@gmail.com'
        ]
      },
      {
        title: '6. Zarządzanie plikami cookie',
        content: [
          'Możesz zarządzać ustawieniami plików cookie w dowolnym momencie:',
          '• Użyj przycisku "Ustawienia plików cookie" w stopce witryny',
          '• Dostosuj ustawienia przeglądarki, aby blokować lub usuwać pliki cookie',
          '• Uwaga: Wyłączenie niezbędnych plików cookie może wpłynąć na funkcjonalność witryny'
        ]
      },
      {
        title: '7. Informacje kontaktowe',
        content: [
          'W sprawach związanych z prywatnością skontaktuj się z nami:',
          '',
          '**Email**: gtframestudioai@gmail.com',
          '**Witryna**: icoffio.com',
          '**Adres**: Warszawa, Polska',
          '**Region**: Unia Europejska'
        ]
      },
      {
        title: '8. Zmiany w polityce',
        content: [
          'Możemy od czasu do czasu aktualizować niniejszą politykę prywatności. Zmiany zostaną opublikowane na tej stronie z zaktualizowaną datą "Ostatnia aktualizacja".',
          '',
          'Kontynuując korzystanie z witryny po wprowadzeniu zmian, akceptujesz zaktualizowaną politykę.'
        ]
      }
    ]
  },
  
  
};

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const locale = params.locale || 'en';
  const t = translations[locale] || translations.en;

  return {
    title: `${t.title} | icoffio`,
    description: t.intro.substring(0, 160),
  };
}

export default function PrivacyPage({ params }: PrivacyPageProps) {
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
            {locale === 'en' && 'Questions about Privacy?'}
            {locale === 'ru' && 'Вопросы о конфиденциальности?'}
            {locale === 'pl' && 'Pytania dotyczące prywatności?'}
            {locale === 'de' && 'Fragen zum Datenschutz?'}
            {locale === 'es' && '¿Preguntas sobre privacidad?'}
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


