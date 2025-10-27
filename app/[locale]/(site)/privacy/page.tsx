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
          '**Location**: Warsaw, Poland, European Union'
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
  
  ru: {
    title: 'Политика конфиденциальности',
    lastUpdated: 'Последнее обновление: 25 октября 2025',
    intro: 'На icoffio.com мы уважаем вашу конфиденциальность и стремимся защитить ваши персональные данные. Эта политика конфиденциальности объясняет, как мы собираем, используем и защищаем вашу информацию при посещении нашего сайта.',
    sections: [
      {
        title: '1. Информация, которую мы собираем',
        content: [
          'Мы собираем минимальную информацию, необходимую для предоставления наших услуг:',
          '• **Cookies**: Необходимые cookies для функциональности сайта и пользовательских настроек (тема, язык)',
          '• **Данные аналитики**: Анонимная статистика использования через Google Analytics (просмотры страниц, тип браузера, информация об устройстве)',
          '• **IP-адреса**: Временно обрабатываются в целях безопасности и аналитики'
        ]
      },
      {
        title: '2. Как мы используем вашу информацию',
        content: [
          'Мы используем собранную информацию для:',
          '• Предоставления и улучшения наших веб-услуг',
          '• Анализа трафика и поведения пользователей',
          '• Запоминания ваших предпочтений (тема, язык)',
          '• Показа релевантной рекламы через VOX',
          '• Обеспечения безопасности сайта и предотвращения злоупотреблений'
        ]
      },
      {
        title: '3. Сторонние сервисы',
        content: [
          'Мы используем следующие сторонние сервисы:',
          '• **Google Analytics**: Для аналитики и статистики сайта',
          '• **VOX**: Для показа релевантной рекламы',
          '• **WordPress**: Для управления контентом',
          '',
          'Эти сервисы могут собирать данные согласно их собственным политикам конфиденциальности. Ознакомьтесь с их политиками для получения дополнительной информации.'
        ]
      },
      {
        title: '4. Хранение данных',
        content: [
          '• **Cookies**: Хранятся до 365 дней (или до их удаления)',
          '• **Данные аналитики**: Google Analytics хранит данные в течение 26 месяцев',
          '• **Предпочтения**: Хранятся в локальном хранилище вашего браузера'
        ]
      },
      {
        title: '5. Ваши права (GDPR)',
        content: [
          'Если вы находитесь в Европейском Союзе, вы имеете право:',
          '• Получить доступ к вашим персональным данным',
          '• Запросить исправление или удаление ваших данных',
          '• Отозвать согласие на обработку данных',
          '• Возразить против обработки данных',
          '• Переносимость данных',
          '',
          'Для реализации этих прав свяжитесь с нами: gtframestudioai@gmail.com'
        ]
      },
      {
        title: '6. Управление cookies',
        content: [
          'Вы можете управлять настройками cookies в любое время:',
          '• Используйте кнопку "Настройки cookies" в футере сайта',
          '• Настройте браузер для блокировки или удаления cookies',
          '• Примечание: Отключение необходимых cookies может повлиять на функциональность сайта'
        ]
      },
      {
        title: '7. Контактная информация',
        content: [
          'По вопросам конфиденциальности свяжитесь с нами:',
          '',
          '**Email**: gtframestudioai@gmail.com',
          '**Сайт**: icoffio.com',
          '**Местоположение**: Варшава, Польша, Европейский Союз'
        ]
      },
      {
        title: '8. Изменения в политике',
        content: [
          'Мы можем обновлять эту политику конфиденциальности время от времени. Изменения будут опубликованы на этой странице с обновленной датой "Последнее обновление".',
          '',
          'Продолжая использовать сайт после внесения изменений, вы принимаете обновленную политику.'
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
          '**Lokalizacja**: Warszawa, Polska, Unia Europejska'
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
  
  de: {
    title: 'Datenschutzerklärung',
    lastUpdated: 'Zuletzt aktualisiert: 25. Oktober 2025',
    intro: 'Bei icoffio.com respektieren wir Ihre Privatsphäre und verpflichten uns zum Schutz Ihrer personenbezogenen Daten. Diese Datenschutzerklärung erläutert, wie wir Ihre Informationen beim Besuch unserer Website sammeln, verwenden und schützen.',
    sections: [
      {
        title: '1. Informationen, die wir sammeln',
        content: [
          'Wir sammeln minimale Informationen, die zur Bereitstellung unserer Dienste erforderlich sind:',
          '• **Cookies**: Notwendige Cookies für Website-Funktionalität und Benutzereinstellungen (Design, Sprache)',
          '• **Analysedaten**: Anonyme Nutzungsstatistiken über Google Analytics (Seitenaufrufe, Browsertyp, Geräteinformationen)',
          '• **IP-Adressen**: Vorübergehend verarbeitet für Sicherheits- und Analysezwecke'
        ]
      },
      {
        title: '2. Wie wir Ihre Informationen verwenden',
        content: [
          'Wir verwenden gesammelte Informationen, um:',
          '• Unsere Website-Dienste bereitzustellen und zu verbessern',
          '• Website-Traffic und Nutzerverhalten zu analysieren',
          '• Ihre Präferenzen zu speichern (Design, Sprache)',
          '• Relevante Werbung über VOX anzuzeigen',
          '• Website-Sicherheit zu gewährleisten und Missbrauch zu verhindern'
        ]
      },
      {
        title: '3. Drittanbieter-Dienste',
        content: [
          'Wir nutzen folgende Drittanbieter-Dienste:',
          '• **Google Analytics**: Für Website-Analysen und Einblicke',
          '• **VOX**: Für die Anzeige relevanter Werbung',
          '• **WordPress**: Für Content-Management',
          '',
          'Diese Dienste können Daten gemäß ihren eigenen Datenschutzrichtlinien sammeln. Bitte überprüfen Sie deren Richtlinien für weitere Informationen.'
        ]
      },
      {
        title: '4. Datenspeicherung',
        content: [
          '• **Cookies**: Bis zu 365 Tage gespeichert (oder bis Sie sie löschen)',
          '• **Analysedaten**: Google Analytics speichert Daten für 26 Monate',
          '• **Präferenzen**: Im lokalen Speicher Ihres Browsers gespeichert'
        ]
      },
      {
        title: '5. Ihre Rechte (DSGVO)',
        content: [
          'Wenn Sie sich in der Europäischen Union befinden, haben Sie das Recht auf:',
          '• Zugang zu Ihren personenbezogenen Daten',
          '• Berichtigung oder Löschung Ihrer Daten',
          '• Widerruf der Einwilligung zur Datenverarbeitung',
          '• Widerspruch gegen die Datenverarbeitung',
          '• Datenübertragbarkeit',
          '',
          'Um diese Rechte auszuüben, kontaktieren Sie uns unter: gtframestudioai@gmail.com'
        ]
      },
      {
        title: '6. Cookie-Verwaltung',
        content: [
          'Sie können Ihre Cookie-Einstellungen jederzeit verwalten:',
          '• Verwenden Sie die Schaltfläche "Cookie-Einstellungen" in der Website-Fußzeile',
          '• Passen Sie Ihre Browser-Einstellungen an, um Cookies zu blockieren oder zu löschen',
          '• Hinweis: Das Deaktivieren notwendiger Cookies kann die Website-Funktionalität beeinträchtigen'
        ]
      },
      {
        title: '7. Kontaktinformationen',
        content: [
          'Für datenschutzbezogene Anfragen kontaktieren Sie uns bitte:',
          '',
          '**E-Mail**: gtframestudioai@gmail.com',
          '**Website**: icoffio.com',
          '**Standort**: Warschau, Polen, Europäische Union'
        ]
      },
      {
        title: '8. Änderungen an dieser Richtlinie',
        content: [
          'Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Änderungen werden auf dieser Seite mit einem aktualisierten Datum "Zuletzt aktualisiert" veröffentlicht.',
          '',
          'Ihre fortgesetzte Nutzung der Website nach Änderungen bedeutet die Akzeptanz der aktualisierten Richtlinie.'
        ]
      }
    ]
  },
  
  es: {
    title: 'Política de privacidad',
    lastUpdated: 'Última actualización: 25 de octubre de 2025',
    intro: 'En icoffio.com, respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta política de privacidad explica cómo recopilamos, usamos y protegemos su información cuando visita nuestro sitio web.',
    sections: [
      {
        title: '1. Información que recopilamos',
        content: [
          'Recopilamos información mínima necesaria para proporcionar nuestros servicios:',
          '• **Cookies**: Cookies esenciales para la funcionalidad del sitio web y las preferencias del usuario (tema, idioma)',
          '• **Datos analíticos**: Estadísticas de uso anónimas a través de Google Analytics (vistas de página, tipo de navegador, información del dispositivo)',
          '• **Direcciones IP**: Procesadas temporalmente con fines de seguridad y análisis'
        ]
      },
      {
        title: '2. Cómo usamos su información',
        content: [
          'Utilizamos la información recopilada para:',
          '• Proporcionar y mejorar nuestros servicios web',
          '• Analizar el tráfico del sitio web y el comportamiento del usuario',
          '• Recordar sus preferencias (tema, idioma)',
          '• Mostrar publicidad relevante a través de VOX',
          '• Garantizar la seguridad del sitio web y prevenir abusos'
        ]
      },
      {
        title: '3. Servicios de terceros',
        content: [
          'Utilizamos los siguientes servicios de terceros:',
          '• **Google Analytics**: Para análisis e información del sitio web',
          '• **VOX**: Para mostrar anuncios relevantes',
          '• **WordPress**: Para gestión de contenido',
          '',
          'Estos servicios pueden recopilar datos de acuerdo con sus propias políticas de privacidad. Revise sus políticas para obtener más información.'
        ]
      },
      {
        title: '4. Retención de datos',
        content: [
          '• **Cookies**: Almacenadas hasta 365 días (o hasta que las elimine)',
          '• **Datos analíticos**: Google Analytics retiene datos durante 26 meses',
          '• **Preferencias**: Almacenadas en el almacenamiento local de su navegador'
        ]
      },
      {
        title: '5. Sus derechos (RGPD)',
        content: [
          'Si se encuentra en la Unión Europea, tiene derecho a:',
          '• Acceder a sus datos personales',
          '• Solicitar la corrección o eliminación de sus datos',
          '• Retirar el consentimiento para el procesamiento de datos',
          '• Oponerse al procesamiento de datos',
          '• Portabilidad de datos',
          '',
          'Para ejercer estos derechos, contáctenos en: gtframestudioai@gmail.com'
        ]
      },
      {
        title: '6. Gestión de cookies',
        content: [
          'Puede gestionar sus preferencias de cookies en cualquier momento:',
          '• Use el botón "Configuración de cookies" en el pie de página del sitio web',
          '• Ajuste la configuración de su navegador para bloquear o eliminar cookies',
          '• Nota: Deshabilitar las cookies necesarias puede afectar la funcionalidad del sitio web'
        ]
      },
      {
        title: '7. Información de contacto',
        content: [
          'Para consultas relacionadas con la privacidad, contáctenos en:',
          '',
          '**Correo electrónico**: gtframestudioai@gmail.com',
          '**Sitio web**: icoffio.com',
          '**Ubicación**: Varsovia, Polonia, Unión Europea'
        ]
      },
      {
        title: '8. Cambios en esta política',
        content: [
          'Podemos actualizar esta política de privacidad de vez en cuando. Los cambios se publicarán en esta página con una fecha actualizada de "Última actualización".',
          '',
          'Su uso continuado del sitio web después de los cambios indica la aceptación de la política actualizada.'
        ]
      }
    ]
  }
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

