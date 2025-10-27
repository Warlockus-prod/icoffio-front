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
          '**Location**: Warsaw, Poland, European Union',
          '',
          'For general privacy inquiries, see our Privacy Policy.'
        ]
      }
    ]
  },
  
  ru: {
    title: 'Политика cookies',
    lastUpdated: 'Последнее обновление: 25 октября 2025',
    intro: 'Эта Политика cookies объясняет, как icoffio.com использует cookies и аналогичные технологии отслеживания при посещении нашего сайта. Продолжая использовать наш сайт, вы соглашаетесь с использованием cookies в соответствии с этой политикой.',
    sections: [
      {
        title: '1. Что такое cookies?',
        content: [
          'Cookies — это небольшие текстовые файлы, хранящиеся на вашем устройстве (компьютере, планшете или мобильном телефоне) при посещении сайта. Они помогают сайтам запоминать ваши предпочтения и улучшать опыт просмотра.',
          '',
          'Cookies могут быть:',
          '• **Сеансовые cookies**: Временные cookies, удаляемые при закрытии браузера',
          '• **Постоянные cookies**: Хранятся на устройстве установленный период или до их удаления'
        ]
      },
      {
        title: '2. Типы cookies, которые мы используем',
        content: [
          '**2.1. Необходимые cookies (Всегда активны)**',
          'Эти cookies необходимы для правильной работы сайта. Они обеспечивают базовые функции:',
          '• Настройки темы (светлая/темная)',
          '• Выбор языка',
          '• Настройки согласия на cookies',
          '• Безопасность и предотвращение мошенничества',
          '',
          'Вы не можете отказаться от этих cookies, так как они необходимы для работы сайта.',
          '',
          '**2.2. Аналитические cookies (Опционально)**',
          'Мы используем Google Analytics для понимания взаимодействия посетителей с сайтом:',
          '• **Провайдер**: Google LLC',
          '• **Цель**: Аналитика сайта и мониторинг производительности',
          '• **Собираемые данные**: Просмотры страниц, длительность сеанса, показатель отказов, тип браузера, информация об устройстве, анонимизированные IP-адреса',
          '• **Хранение**: 26 месяцев',
          '• **Google Analytics ID**: G-35P327PYGH',
          '',
          'Эти cookies помогают нам улучшать наш сайт и пользовательский опыт.',
          '',
          '**2.3. Рекламные cookies (Опционально)**',
          'Мы используем рекламную платформу VOX для показа релевантной рекламы:',
          '• **Провайдер**: VOX (Malware.Expert WAF)',
          '• **Цель**: Показ контекстной и поведенческой рекламы',
          '• **Типы**: In-Image реклама, Display реклама (728x90, 970x250, 300x250, 300x600, 160x600, 320x50, 320x100, 320x480)',
          '• **Собираемые данные**: Поведение при просмотре, взаимодействие с рекламой, информация об устройстве',
          '',
          'Эти cookies помогают нам монетизировать сайт и сохранять контент бесплатным.'
        ]
      },
      {
        title: '3. Сторонние cookies',
        content: [
          'Некоторые cookies устанавливаются сторонними сервисами, которые мы используем:',
          '',
          '**Google Analytics**',
          '• Домен: `.google-analytics.com`',
          '• Цель: Аналитика сайта',
          '• Политика конфиденциальности: https://policies.google.com/privacy',
          '',
          '**VOX Реклама**',
          '• Домен: Различные рекламные домены',
          '• Цель: Доставка и отслеживание рекламы',
          '• Политика конфиденциальности: См. документацию VOX/Malware.Expert',
          '',
          '**WordPress (Управление контентом)**',
          '• Домен: `icoffio.com`',
          '• Цель: Доставка контента и кеширование',
          '',
          'Эти сторонние сервисы могут использовать собственные cookies согласно их политикам конфиденциальности.'
        ]
      },
      {
        title: '4. Как управлять cookies',
        content: [
          'У вас есть несколько вариантов контроля cookies:',
          '',
          '**4.1. Настройки cookies на нашем сайте**',
          'Нажмите кнопку "Настройки cookies" в футере сайта, чтобы:',
          '• Принять все cookies',
          '• Отклонить опциональные cookies (Аналитика и Реклама)',
          '• Настроить предпочтения',
          '',
          '**4.2. Настройки браузера**',
          'Вы можете настроить браузер, чтобы:',
          '• Блокировать все cookies',
          '• Блокировать только сторонние cookies',
          '• Удалять cookies после каждой сессии',
          '• Получать уведомления перед установкой cookies',
          '',
          'Инструкции для популярных браузеров:',
          '• **Chrome**: Настройки → Конфиденциальность и безопасность → Файлы cookie',
          '• **Firefox**: Настройки → Приватность и защита → Куки',
          '• **Safari**: Настройки → Конфиденциальность → Файлы cookie',
          '• **Edge**: Настройки → Файлы cookie и разрешения сайтов',
          '',
          '⚠️ **Примечание**: Отключение необходимых cookies может повлиять на функциональность сайта.'
        ]
      },
      {
        title: '5. Сроки хранения cookies',
        content: [
          'Разные cookies имеют разные сроки хранения:',
          '',
          '• **Необходимые cookies**: Сеансовые cookies (удаляются при закрытии браузера) или 365 дней',
          '• **Согласие на cookies**: 365 дней',
          '• **Настройки темы**: 365 дней',
          '• **Настройки языка**: 365 дней',
          '• **Google Analytics**: 26 месяцев',
          '• **VOX Реклама**: Варьируется в зависимости от рекламной сети'
        ]
      },
      {
        title: '6. Do Not Track (DNT)',
        content: [
          'Некоторые браузеры имеют функцию "Do Not Track" (DNT), которая сигнализирует сайтам о том, что вы не хотите быть отслеживаемым.',
          '',
          'В настоящее время нет универсального стандарта того, как сайты должны реагировать на сигналы DNT. Мы уважаем ваш выбор конфиденциальности через баннер согласия на cookies, который позволяет отказаться от аналитических и рекламных cookies.'
        ]
      },
      {
        title: '7. Обновления политики',
        content: [
          'Мы можем обновлять эту Политику cookies время от времени, чтобы отразить изменения в:',
          '• Технологиях cookies, которые мы используем',
          '• Законодательных требованиях',
          '• Наших сервисах и функциях',
          '',
          'При внесении значительных изменений мы:',
          '• Обновим дату "Последнее обновление" вверху страницы',
          '• Запросим ваше согласие снова, если это требуется законом',
          '',
          'Рекомендуем периодически проверять эту страницу на наличие обновлений.'
        ]
      },
      {
        title: '8. Свяжитесь с нами',
        content: [
          'Если у вас есть вопросы об использовании cookies, свяжитесь с нами:',
          '',
          '**Email**: gtframestudioai@gmail.com',
          '**Сайт**: icoffio.com',
          '**Местоположение**: Варшава, Польша, Европейский Союз',
          '',
          'Для общих вопросов о конфиденциальности см. нашу Политику конфиденциальности.'
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
          '**Lokalizacja**: Warszawa, Polska, Unia Europejska',
          '',
          'W przypadku ogólnych zapytań dotyczących prywatności zobacz naszą Politykę prywatności.'
        ]
      }
    ]
  },
  
  de: {
    title: 'Cookie-Richtlinie',
    lastUpdated: 'Zuletzt aktualisiert: 25. Oktober 2025',
    intro: 'Diese Cookie-Richtlinie erklärt, wie icoffio.com Cookies und ähnliche Tracking-Technologien verwendet, wenn Sie unsere Website besuchen. Durch die weitere Nutzung unserer Website stimmen Sie der Verwendung von Cookies gemäß dieser Richtlinie zu.',
    sections: [
      {
        title: '1. Was sind Cookies?',
        content: [
          'Cookies sind kleine Textdateien, die auf Ihrem Gerät (Computer, Tablet oder Mobiltelefon) gespeichert werden, wenn Sie eine Website besuchen. Sie helfen Websites, sich Ihre Präferenzen zu merken und Ihr Browsing-Erlebnis zu verbessern.',
          '',
          'Cookies können sein:',
          '• **Sitzungs-Cookies**: Temporäre Cookies, die beim Schließen Ihres Browsers gelöscht werden',
          '• **Dauerhafte Cookies**: Werden für einen festgelegten Zeitraum auf Ihrem Gerät gespeichert oder bis Sie sie löschen'
        ]
      },
      {
        title: '2. Arten von Cookies, die wir verwenden',
        content: [
          '**2.1. Notwendige Cookies (Immer aktiv)**',
          'Diese Cookies sind für das ordnungsgemäße Funktionieren der Website unerlässlich. Sie ermöglichen grundlegende Funktionen:',
          '• Design-Präferenzen (hell/dunkel)',
          '• Sprachauswahl',
          '• Cookie-Zustimmungseinstellungen',
          '• Sicherheit und Betrugsprävention',
          '',
          'Sie können diese Cookies nicht ablehnen, da sie für die Funktionsweise der Website notwendig sind.',
          '',
          '**2.2. Analytische Cookies (Optional)**',
          'Wir verwenden Google Analytics, um zu verstehen, wie Besucher mit unserer Website interagieren:',
          '• **Anbieter**: Google LLC',
          '• **Zweck**: Website-Analyse und Leistungsüberwachung',
          '• **Gesammelte Daten**: Seitenaufrufe, Sitzungsdauer, Absprungrate, Browsertyp, Geräteinformationen, anonymisierte IP-Adressen',
          '• **Aufbewahrung**: 26 Monate',
          '• **Google Analytics ID**: G-35P327PYGH',
          '',
          'Diese Cookies helfen uns, unsere Website und das Benutzererlebnis zu verbessern.',
          '',
          '**2.3. Werbe-Cookies (Optional)**',
          'Wir verwenden die VOX-Werbeplattform, um relevante Anzeigen anzuzeigen:',
          '• **Anbieter**: VOX (Malware.Expert WAF)',
          '• **Zweck**: Anzeige kontextbezogener und verhaltensbasierter Werbung',
          '• **Arten**: In-Image-Anzeigen, Display-Anzeigen (728x90, 970x250, 300x250, 300x600, 160x600, 320x50, 320x100, 320x480)',
          '• **Gesammelte Daten**: Browsing-Verhalten, Anzeigeninteraktionen, Geräteinformationen',
          '',
          'Diese Cookies helfen uns, die Website zu monetarisieren und unsere Inhalte kostenlos zu halten.'
        ]
      },
      {
        title: '3. Drittanbieter-Cookies',
        content: [
          'Einige Cookies werden von Drittanbieterdiensten gesetzt, die wir verwenden:',
          '',
          '**Google Analytics**',
          '• Domain: `.google-analytics.com`',
          '• Zweck: Website-Analyse',
          '• Datenschutzerklärung: https://policies.google.com/privacy',
          '',
          '**VOX-Werbung**',
          '• Domain: Verschiedene Werbedomains',
          '• Zweck: Anzeigenbereitstellung und -verfolgung',
          '• Datenschutzerklärung: Siehe VOX/Malware.Expert Dokumentation',
          '',
          '**WordPress (Content-Management)**',
          '• Domain: `icoffio.com`',
          '• Zweck: Inhaltsbereitstellung und Caching',
          '',
          'Diese Drittanbieterdienste können eigene Cookies gemäß ihren Datenschutzrichtlinien verwenden.'
        ]
      },
      {
        title: '4. Wie man Cookies verwaltet',
        content: [
          'Sie haben mehrere Möglichkeiten, Cookies zu kontrollieren:',
          '',
          '**4.1. Cookie-Einstellungen auf unserer Website**',
          'Klicken Sie auf die Schaltfläche "Cookie-Einstellungen" in der Website-Fußzeile, um:',
          '• Alle Cookies zu akzeptieren',
          '• Optionale Cookies (Analytik und Werbung) abzulehnen',
          '• Präferenzen anzupassen',
          '',
          '**4.2. Browser-Einstellungen**',
          'Sie können Ihren Browser konfigurieren, um:',
          '• Alle Cookies zu blockieren',
          '• Nur Drittanbieter-Cookies zu blockieren',
          '• Cookies nach jeder Sitzung zu löschen',
          '• Benachrichtigungen zu erhalten, bevor Cookies gesetzt werden',
          '',
          'Anleitungen für beliebte Browser:',
          '• **Chrome**: Einstellungen → Datenschutz und Sicherheit → Cookies',
          '• **Firefox**: Einstellungen → Datenschutz & Sicherheit → Cookies',
          '• **Safari**: Einstellungen → Datenschutz → Cookies',
          '• **Edge**: Einstellungen → Cookies und Websiteberechtigungen',
          '',
          '⚠️ **Hinweis**: Das Deaktivieren notwendiger Cookies kann die Website-Funktionalität beeinträchtigen.'
        ]
      },
      {
        title: '5. Cookie-Aufbewahrungsfristen',
        content: [
          'Verschiedene Cookies haben unterschiedliche Lebensdauern:',
          '',
          '• **Notwendige Cookies**: Sitzungs-Cookies (beim Schließen des Browsers gelöscht) oder 365 Tage',
          '• **Cookie-Zustimmung**: 365 Tage',
          '• **Design-Präferenzen**: 365 Tage',
          '• **Sprachpräferenzen**: 365 Tage',
          '• **Google Analytics**: 26 Monate',
          '• **VOX-Werbung**: Variiert je nach Werbenetzwerk'
        ]
      },
      {
        title: '6. Do Not Track (DNT)',
        content: [
          'Einige Browser haben eine "Do Not Track" (DNT)-Funktion, die Websites signalisiert, dass Sie nicht verfolgt werden möchten.',
          '',
          'Derzeit gibt es keinen universellen Standard dafür, wie Websites auf DNT-Signale reagieren sollten. Wir respektieren Ihre Datenschutzentscheidungen durch unseren Cookie-Zustimmungsbanner, der es Ihnen ermöglicht, Analytik- und Werbe-Cookies abzulehnen.'
        ]
      },
      {
        title: '7. Aktualisierungen dieser Richtlinie',
        content: [
          'Wir können diese Cookie-Richtlinie von Zeit zu Zeit aktualisieren, um Änderungen widerzuspiegeln in:',
          '• Cookie-Technologien, die wir verwenden',
          '• Gesetzlichen Anforderungen',
          '• Unseren Diensten und Funktionen',
          '',
          'Bei wesentlichen Änderungen werden wir:',
          '• Das Datum "Zuletzt aktualisiert" oben auf dieser Seite aktualisieren',
          '• Bei gesetzlicher Anforderung erneut um Ihre Zustimmung bitten',
          '',
          'Wir empfehlen, diese Seite regelmäßig auf Aktualisierungen zu überprüfen.'
        ]
      },
      {
        title: '8. Kontaktieren Sie uns',
        content: [
          'Wenn Sie Fragen zur Verwendung von Cookies haben, kontaktieren Sie uns bitte:',
          '',
          '**E-Mail**: gtframestudioai@gmail.com',
          '**Website**: icoffio.com',
          '**Standort**: Warschau, Polen, Europäische Union',
          '',
          'Für allgemeine Datenschutzanfragen siehe unsere Datenschutzerklärung.'
        ]
      }
    ]
  },
  
  es: {
    title: 'Política de cookies',
    lastUpdated: 'Última actualización: 25 de octubre de 2025',
    intro: 'Esta Política de cookies explica cómo icoffio.com utiliza cookies y tecnologías de seguimiento similares cuando visita nuestro sitio web. Al continuar usando nuestro sitio web, usted acepta el uso de cookies de acuerdo con esta política.',
    sections: [
      {
        title: '1. ¿Qué son las cookies?',
        content: [
          'Las cookies son pequeños archivos de texto almacenados en su dispositivo (ordenador, tablet o móvil) cuando visita un sitio web. Ayudan a los sitios web a recordar sus preferencias y mejorar su experiencia de navegación.',
          '',
          'Las cookies pueden ser:',
          '• **Cookies de sesión**: Cookies temporales eliminadas cuando cierra su navegador',
          '• **Cookies persistentes**: Almacenadas en su dispositivo durante un período establecido o hasta que las elimine'
        ]
      },
      {
        title: '2. Tipos de cookies que utilizamos',
        content: [
          '**2.1. Cookies necesarias (Siempre activas)**',
          'Estas cookies son esenciales para el funcionamiento correcto del sitio web. Habilitan características básicas:',
          '• Preferencias de tema (modo claro/oscuro)',
          '• Selección de idioma',
          '• Configuración de consentimiento de cookies',
          '• Seguridad y prevención de fraudes',
          '',
          'No puede optar por no usar estas cookies ya que son necesarias para que el sitio funcione.',
          '',
          '**2.2. Cookies analíticas (Opcionales)**',
          'Utilizamos Google Analytics para comprender cómo los visitantes interactúan con nuestro sitio web:',
          '• **Proveedor**: Google LLC',
          '• **Propósito**: Análisis web y monitoreo de rendimiento',
          '• **Datos recopilados**: Vistas de página, duración de sesión, tasa de rebote, tipo de navegador, información del dispositivo, direcciones IP anonimizadas',
          '• **Retención**: 26 meses',
          '• **ID de Google Analytics**: G-35P327PYGH',
          '',
          'Estas cookies nos ayudan a mejorar nuestro sitio web y la experiencia del usuario.',
          '',
          '**2.3. Cookies publicitarias (Opcionales)**',
          'Utilizamos la plataforma publicitaria VOX para mostrar anuncios relevantes:',
          '• **Proveedor**: VOX (Malware.Expert WAF)',
          '• **Propósito**: Mostrar publicidad contextual y comportamental',
          '• **Tipos**: Anuncios In-Image, anuncios Display (728x90, 970x250, 300x250, 300x600, 160x600, 320x50, 320x100, 320x480)',
          '• **Datos recopilados**: Comportamiento de navegación, interacciones con anuncios, información del dispositivo',
          '',
          'Estas cookies nos ayudan a monetizar el sitio web y mantener nuestro contenido gratuito.'
        ]
      },
      {
        title: '3. Cookies de terceros',
        content: [
          'Algunas cookies son establecidas por servicios de terceros que utilizamos:',
          '',
          '**Google Analytics**',
          '• Dominio: `.google-analytics.com`',
          '• Propósito: Análisis web',
          '• Política de privacidad: https://policies.google.com/privacy',
          '',
          '**Publicidad VOX**',
          '• Dominio: Varios dominios publicitarios',
          '• Propósito: Entrega y seguimiento de anuncios',
          '• Política de privacidad: Consulte la documentación de VOX/Malware.Expert',
          '',
          '**WordPress (Gestión de contenido)**',
          '• Dominio: `icoffio.com`',
          '• Propósito: Entrega de contenido y almacenamiento en caché',
          '',
          'Estos servicios de terceros pueden usar sus propias cookies de acuerdo con sus políticas de privacidad.'
        ]
      },
      {
        title: '4. Cómo gestionar las cookies',
        content: [
          'Tiene varias opciones para controlar las cookies:',
          '',
          '**4.1. Configuración de cookies en nuestro sitio web**',
          'Haga clic en el botón "Configuración de cookies" en el pie de página del sitio web para:',
          '• Aceptar todas las cookies',
          '• Rechazar cookies opcionales (Análisis y Publicidad)',
          '• Personalizar sus preferencias',
          '',
          '**4.2. Configuración del navegador**',
          'Puede configurar su navegador para:',
          '• Bloquear todas las cookies',
          '• Bloquear solo cookies de terceros',
          '• Eliminar cookies después de cada sesión',
          '• Recibir notificaciones antes de que se establezcan cookies',
          '',
          'Instrucciones para navegadores populares:',
          '• **Chrome**: Configuración → Privacidad y seguridad → Cookies',
          '• **Firefox**: Configuración → Privacidad y seguridad → Cookies',
          '• **Safari**: Preferencias → Privacidad → Cookies',
          '• **Edge**: Configuración → Cookies y permisos del sitio',
          '',
          '⚠️ **Nota**: Deshabilitar las cookies necesarias puede afectar la funcionalidad del sitio web.'
        ]
      },
      {
        title: '5. Períodos de retención de cookies',
        content: [
          'Diferentes cookies tienen diferentes períodos de vida:',
          '',
          '• **Cookies necesarias**: Cookies de sesión (eliminadas al cerrar el navegador) o 365 días',
          '• **Consentimiento de cookies**: 365 días',
          '• **Preferencias de tema**: 365 días',
          '• **Preferencias de idioma**: 365 días',
          '• **Google Analytics**: 26 meses',
          '• **Publicidad VOX**: Varía según la red publicitaria'
        ]
      },
      {
        title: '6. Do Not Track (DNT)',
        content: [
          'Algunos navegadores tienen una función "Do Not Track" (DNT) que señala a los sitios web que no desea ser rastreado.',
          '',
          'Actualmente, no existe un estándar universal sobre cómo los sitios web deben responder a las señales DNT. Respetamos sus elecciones de privacidad a través de nuestro banner de consentimiento de cookies, que le permite optar por no usar cookies de análisis y publicidad.'
        ]
      },
      {
        title: '7. Actualizaciones de esta política',
        content: [
          'Podemos actualizar esta Política de cookies de vez en cuando para reflejar cambios en:',
          '• Tecnologías de cookies que utilizamos',
          '• Requisitos legales',
          '• Nuestros servicios y características',
          '',
          'Cuando realicemos cambios significativos:',
          '• Actualizaremos la fecha de "Última actualización" en la parte superior de esta página',
          '• Solicitaremos su consentimiento nuevamente si lo exige la ley',
          '',
          'Recomendamos consultar esta página periódicamente para ver actualizaciones.'
        ]
      },
      {
        title: '8. Contáctenos',
        content: [
          'Si tiene preguntas sobre nuestro uso de cookies, contáctenos en:',
          '',
          '**Correo electrónico**: gtframestudioai@gmail.com',
          '**Sitio web**: icoffio.com',
          '**Ubicación**: Varsovia, Polonia, Unión Europea',
          '',
          'Para consultas generales sobre privacidad, consulte nuestra Política de privacidad.'
        ]
      }
    ]
  }
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

