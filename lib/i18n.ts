export const locales = ['en', 'pl', 'de', 'ro', 'cs'] as const;
export type Locale = typeof locales[number];

export const localeNames = {
  en: 'English',
  pl: 'Polski', 
  de: 'Deutsch',
  ro: 'Română',
  cs: 'Čeština'
};

export const translations = {
  en: {
    // Site Meta
    siteTitle: "icoffio — gadgets, technology and more",
    siteDescription: "We tell about important events in the world of technology. News, reviews and articles about Apple, AI, games and new technologies.",
    
    // Navigation
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
    
    // Footer
    aboutProject: "About Project",
    editorial: "Editorial",
    advertising: "Advertising", 
    applications: "Applications",
    followUs: "Follow Us",
    allRightsReserved: "All rights reserved",
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
    
    // Footer
    aboutProject: "O Projekcie",
    editorial: "Redakcja",
    advertising: "Reklama",
    applications: "Aplikacje", 
    followUs: "Śledź nas",
    allRightsReserved: "Wszystkie prawa zastrzeżone",
    coveringTechEvents: "Relacjonujemy najważniejsze wydarzenia ze świata technologii",
    
    // Dates
    hoursAgo: "godzin temu",
    dayAgo: "dzień temu", 
    daysAgo: "dni temu"
  },
  
  de: {
    // Site Meta
    siteTitle: "icoffio — Gadgets, Technologie und mehr",
    siteDescription: "Wir berichten über wichtige Ereignisse in der Welt der Technologie. Nachrichten, Bewertungen und Artikel über Apple, KI, Spiele und neue Technologien.",
    
    // Navigation
    articles: "Artikel",
    reviews: "Bewertungen",
    news: "Nachrichten",
    
    // Categories
    ai: "KI",
    apple: "Apple", 
    games: "Spiele",
    tech: "Technik",
    
    // Common
    readMore: "Mehr lesen",
    showMore: "Mehr anzeigen",
    readingTime: "Min Lesezeit",
    relatedArticles: "Ähnliche Artikel", 
    latestNews: "Neueste Nachrichten",
    mostActualEvents: "Die aktuellsten Ereignisse aus der Welt der Technologie",
    
    // Footer
    aboutProject: "Über das Projekt",
    editorial: "Redaktion",
    advertising: "Werbung",
    applications: "Anwendungen",
    followUs: "Folge uns",
    allRightsReserved: "Alle Rechte vorbehalten", 
    coveringTechEvents: "Wir berichten über die wichtigsten Ereignisse in der Welt der Technologie",
    
    // Dates
    hoursAgo: "Stunden her",
    dayAgo: "Tag her",
    daysAgo: "Tage her"
  },
  
  ro: {
    // Site Meta
    siteTitle: "icoffio — gadgeturi, tehnologie și mai mult",
    siteDescription: "Povestim despre evenimente importante din lumea tehnologiei. Știri, recenzii și articole despre Apple, AI, jocuri și tehnologii noi.",
    
    // Navigation
    articles: "Articole",
    reviews: "Recenzii", 
    news: "Știri",
    
    // Categories
    ai: "AI",
    apple: "Apple",
    games: "Jocuri",
    tech: "Tehnologie",
    
    // Common
    readMore: "Citește mai mult",
    showMore: "Arată mai mult",
    readingTime: "min de citit",
    relatedArticles: "Articole similare",
    latestNews: "Ultimele știri", 
    mostActualEvents: "Evenimentele cele mai actuale din lumea tehnologiei",
    
    // Footer
    aboutProject: "Despre Proiect",
    editorial: "Echipa editorială",
    advertising: "Publicitate",
    applications: "Aplicații",
    followUs: "Urmărește-ne",
    allRightsReserved: "Toate drepturile rezervate",
    coveringTechEvents: "Acoperim cele mai importante evenimente din lumea tehnologiei",
    
    // Dates
    hoursAgo: "ore în urmă",
    dayAgo: "zi în urmă",
    daysAgo: "zile în urmă"
  },
  
  cs: {
    // Site Meta
    siteTitle: "icoffio — gadgety, technologie a více",
    siteDescription: "Vyprávíme o důležitých událostech ve světě technologií. Zprávy, recenze a články o Apple, AI, hrách a nových technologiích.",
    
    // Navigation
    articles: "Články",
    reviews: "Recenze",
    news: "Zprávy",
    
    // Categories  
    ai: "AI",
    apple: "Apple",
    games: "Hry",
    tech: "Technologie",
    
    // Common
    readMore: "Číst více",
    showMore: "Zobrazit více",
    readingTime: "min čtení", 
    relatedArticles: "Související články",
    latestNews: "Nejnovější zprávy",
    mostActualEvents: "Nejaktuálnější události ze světa technologií",
    
    // Footer
    aboutProject: "O Projektu", 
    editorial: "Redakce",
    advertising: "Reklama",
    applications: "Aplikace",
    followUs: "Sleduj nás",
    allRightsReserved: "Všechna práva vyhrazena",
    coveringTechEvents: "Pokrýváme nejdůležitější události ze světa technologií",
    
    // Dates
    hoursAgo: "hodin zpět",
    dayAgo: "den zpět", 
    daysAgo: "dní zpět"
  }
};

export function getTranslation(locale: Locale = 'en') {
  return translations[locale] || translations.en;
}
