export const locales = ['en', 'pl'] as const;
export type Locale = typeof locales[number];

export const localeNames = {
  en: 'English',
  pl: 'Polski'
};

export const translations = {
  en: {
    // Site Meta
    siteTitle: "icoffio — gadgets, technology and more",
    siteDescription: "We tell about important events in the world of technology. News, reviews and articles about Apple, AI, games and new technologies.",
    
    // Navigation
    home: "Home",
    articles: "Articles",
    reviews: "Reviews", 
    news: "News",
    
    // Categories  
    ai: "AI",
    apple: "Apple",
    games: "Games",
    tech: "Tech",
    
    // Common
    readMore: "Read more",
    showMore: "Show more",
    readingTime: "min read",
    relatedArticles: "Related articles",
    latestNews: "Latest news",
    mostActualEvents: "The most actual events from the world of technology",
    goBack: "Go Back",
    
    // Footer
    about: "About",
    aboutProject: "About Project",
    editorial: "Editorial",
    editorialContent: "The icoffio editorial team brings together experienced journalists, analysts and experts in the field of technology. We follow the latest trends in the world of high technology, artificial intelligence, mobile devices and digital innovation.",
    editorialContact: "Our mission is to provide readers with current, reliable and useful information about technological innovations that shape our future.",
    editorialPageDescription: "Editorial team and experts",
    advertising: "Advertising",
    advertisingContent: "icoffio is a leading technology publication that brings together an active and solvent audience of IT specialists, technology enthusiasts and decision makers in the field of high technology.",
    advertisingContact: "Ready to start an advertising campaign or want to get a detailed media kit? Contact our sales department at advertising@icoffio.com",
    advertisingPageDescription: "Your path to a technology audience",
    applications: "Applications",
    followUs: "Follow Us",
    allRightsReserved: "All rights reserved",
    allRightsReservedFull: "© 2025 icoffio. All rights reserved.",
    coveringTechEvents: "Covering the most important events in the world of technology",
    
    // Dates
    hoursAgo: "hours ago",
    dayAgo: "day ago",
    daysAgo: "days ago"
  },
  
  pl: {
    // Site Meta
    siteTitle: "icoffio — gadżety, technologie i więcej",
    siteDescription: "Opowiadamy o ważnych wydarzeniach w świecie technologii. Wiadomości, recenzje i artykuły o Apple, AI, grach i nowych technologiach.",
    
    // Navigation
    home: "Strona główna",
    articles: "Artykuły",
    reviews: "Recenzje",
    news: "Wiadomości",
    
    // Categories
    ai: "AI", 
    apple: "Apple",
    games: "Gry",
    tech: "Technika",
    
    // Common
    readMore: "Czytaj więcej",
    showMore: "Pokaż więcej", 
    readingTime: "min czytania",
    relatedArticles: "Powiązane artykuły",
    latestNews: "Najnowsze wiadomości",
    mostActualEvents: "Najaktualniejsze wydarzenia ze świata technologii",
    goBack: "Wróć",
    
    // Footer
    about: "O nas",
    aboutProject: "O Projekcie",
    editorial: "Redakcja",
    editorialContent: "Redakcja icoffio łączy doświadczonych dziennikarzy, analityków i ekspertów w dziedzinie technologii. Śledzimy najnowsze trendy w świecie wysokich technologii, sztucznej inteligencji, urządzeń mobilnych i innowacji cyfrowych.",
    editorialContact: "Naszą misją jest dostarczanie czytelnikom aktualnych, wiarygodnych i przydatnych informacji o innowacjach technologicznych, które kształtują naszą przyszłość.",
    editorialPageDescription: "Zespół redakcyjny i eksperci",
    advertising: "Reklama",
    advertisingContent: "icoffio to wiodące wydawnictwo technologiczne, które łączy aktywną i zamożną publiczność specjalistów IT, entuzjastów technologii i decydentów w dziedzinie wysokich technologii.",
    advertisingContact: "Gotowy do rozpoczęcia kampanii reklamowej lub chcesz otrzymać szczegółowy zestaw mediów? Skontaktuj się z naszym działem sprzedaży pod adresem advertising@icoffio.com",
    advertisingPageDescription: "Twoja ścieżka do publiczności technologicznej",
    applications: "Aplikacje",
    followUs: "Śledź nas",
    allRightsReserved: "Wszystkie prawa zastrzeżone",
    allRightsReservedFull: "© 2025 icoffio. Wszystkie prawa zastrzeżone.",
    coveringTechEvents: "Relacjonujemy najważniejsze wydarzenia ze świata technologii",
    
    // Dates
    hoursAgo: "godzin temu",
    dayAgo: "dzień temu", 
    daysAgo: "dni temu"
  }
};

export function getTranslation(locale: Locale | string = 'en') {
  // Convert to Locale type and validate
  const validLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  return translations[validLocale];
}