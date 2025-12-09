/**
 * TELEGRAM BOT TRANSLATIONS v8.6.0
 * 
 * Мультиязычный интерфейс бота (RU/EN/PL)
 */

export type BotLanguage = 'ru' | 'en' | 'pl';

export interface BotTranslations {
  // Commands
  commands: {
    start: string;
    help: string;
    settings: string;
    language: string;
  };
  
  // Welcome & Help
  welcome: {
    title: string;
    description: string;
    howTo: string;
    commands: string;
  };
  
  help: {
    title: string;
    description: string;
    urlExample: string;
    textExample: string;
    availableCommands: string;
  };
  
  // Settings display
  settings: {
    title: string;
    currentSettings: string;
    contentStyle: string;
    images: string;
    autoPublish: string;
    language: string;
    changeInAdmin: string;
  };
  
  // Language selection
  languageSelection: {
    title: string;
    current: string;
    choose: string;
    changed: string;
  };
  
  // Processing messages
  processing: {
    title: string;
    parsingUrl: string;
    processingText: string;
    style: string;
    images: string;
    estimatedTime: string;
  };
  
  // Success messages
  success: {
    published: string;
    savedAsDraft: string;
    title: string;
    statistics: string;
    style: string;
    words: string;
    imagesCount: string;
    category: string;
    time: string;
    links: string;
    note: {
      published: string;
      draft: string;
    };
    editLink: string;
  };
  
  // Error messages
  error: {
    title: string;
    generic: string;
    tryAgain: string;
    contactSupport: string;
  };
  
  // Content styles
  styles: {
    journalistic: string;
    technical: string;
    casual: string;
    educational: string;
    analytical: string;
    keepAsIs: string;
  };
  
  // Misc
  seconds: string;
  enabled: string;
  disabled: string;
}

export const translations: Record<BotLanguage, BotTranslations> = {
  // 🇷🇺 RUSSIAN
  ru: {
    commands: {
      start: '▶️ /start - Начать работу',
      help: '❓ /help - Помощь',
      settings: '⚙️ /settings - Настройки',
      language: '🌐 /language - Язык интерфейса',
    },
    
    welcome: {
      title: '👋 Добро пожаловать в icoffio Bot!',
      description: 'Я помогу вам создавать статьи из текста или URL.',
      howTo: '<b>📝 Как использовать:</b>\n1️⃣ Отправьте URL статьи\n2️⃣ Или напишите текст\n3️⃣ Я создам статью на EN + PL',
      commands: '<b>📋 Команды:</b>',
    },
    
    help: {
      title: '❓ <b>Помощь</b>',
      description: 'Бот автоматически создаёт статьи на двух языках (EN + PL) из текста или URL.',
      urlExample: '<b>📌 Пример URL:</b>\nhttps://techcrunch.com/article',
      textExample: '<b>📌 Пример текста:</b>\nGoogle announces new AI features...',
      availableCommands: '<b>📋 Доступные команды:</b>',
    },
    
    settings: {
      title: '⚙️ <b>Ваши настройки:</b>',
      currentSettings: '<b>Текущие настройки:</b>',
      contentStyle: '📝 Стиль контента',
      images: '🖼️ Изображений',
      autoPublish: '📤 Авто-публикация',
      language: '🌐 Язык интерфейса',
      changeInAdmin: '\n💡 <i>Изменить настройки:</i>\napp.icoffio.com/en/admin → 🤖 Telegram',
    },
    
    languageSelection: {
      title: '🌐 <b>Язык интерфейса бота</b>',
      current: 'Текущий язык',
      choose: 'Выберите язык:',
      changed: '✅ Язык интерфейса изменён на',
    },
    
    processing: {
      title: '⏳ <b>Обрабатываю...</b>',
      parsingUrl: '🔗 Парсю URL',
      processingText: '📝 Обрабатываю текст',
      style: '📝 Стиль',
      images: '🖼️ Картинок',
      estimatedTime: '⏱️ Примерно',
    },
    
    success: {
      published: '✅ ОПУБЛИКОВАНО',
      savedAsDraft: '💾 СОХРАНЕНО В ЧЕРНОВИКИ',
      title: '📝 <b>Заголовок:</b>',
      statistics: '📊 <b>Статистика:</b>',
      style: '• Стиль',
      words: '• Слов',
      imagesCount: '• Изображений',
      category: '• Категория',
      time: '• Время',
      links: '🔗 <b>Ссылки:</b>',
      note: {
        published: '✅ Статья доступна по ссылкам выше',
        draft: '💾 Черновик сохранён. Опубликуйте в админке',
      },
      editLink: '🎨 Редактировать',
    },
    
    error: {
      title: '❌ <b>Ошибка</b>',
      generic: 'Не удалось обработать запрос',
      tryAgain: 'Попробуйте снова или отправьте другой текст/URL',
      contactSupport: 'Если проблема повторяется, свяжитесь с поддержкой',
    },
    
    styles: {
      journalistic: '📰 Journalistic',
      technical: '⚙️ Technical',
      casual: '💬 Casual',
      educational: '🎓 Educational',
      analytical: '📊 Analytical',
      keepAsIs: '✋ Keep As Is',
    },
    
    seconds: 'секунд',
    enabled: 'Включено',
    disabled: 'Выключено',
  },
  
  // 🇬🇧 ENGLISH
  en: {
    commands: {
      start: '▶️ /start - Start',
      help: '❓ /help - Help',
      settings: '⚙️ /settings - Settings',
      language: '🌐 /language - Interface language',
    },
    
    welcome: {
      title: '👋 Welcome to icoffio Bot!',
      description: 'I help you create articles from text or URLs.',
      howTo: '<b>📝 How to use:</b>\n1️⃣ Send article URL\n2️⃣ Or write text\n3️⃣ I\'ll create EN + PL article',
      commands: '<b>📋 Commands:</b>',
    },
    
    help: {
      title: '❓ <b>Help</b>',
      description: 'Bot automatically creates dual-language articles (EN + PL) from text or URL.',
      urlExample: '<b>📌 URL example:</b>\nhttps://techcrunch.com/article',
      textExample: '<b>📌 Text example:</b>\nGoogle announces new AI features...',
      availableCommands: '<b>📋 Available commands:</b>',
    },
    
    settings: {
      title: '⚙️ <b>Your settings:</b>',
      currentSettings: '<b>Current settings:</b>',
      contentStyle: '📝 Content style',
      images: '🖼️ Images',
      autoPublish: '📤 Auto-publish',
      language: '🌐 Interface language',
      changeInAdmin: '\n💡 <i>Change settings:</i>\napp.icoffio.com/en/admin → 🤖 Telegram',
    },
    
    languageSelection: {
      title: '🌐 <b>Bot interface language</b>',
      current: 'Current language',
      choose: 'Choose language:',
      changed: '✅ Interface language changed to',
    },
    
    processing: {
      title: '⏳ <b>Processing...</b>',
      parsingUrl: '🔗 Parsing URL',
      processingText: '📝 Processing text',
      style: '📝 Style',
      images: '🖼️ Images',
      estimatedTime: '⏱️ Estimated time',
    },
    
    success: {
      published: '✅ PUBLISHED',
      savedAsDraft: '💾 SAVED AS DRAFT',
      title: '📝 <b>Title:</b>',
      statistics: '📊 <b>Statistics:</b>',
      style: '• Style',
      words: '• Words',
      imagesCount: '• Images',
      category: '• Category',
      time: '• Time',
      links: '🔗 <b>Links:</b>',
      note: {
        published: '✅ Article available at links above',
        draft: '💾 Draft saved. Publish in admin panel',
      },
      editLink: '🎨 Edit',
    },
    
    error: {
      title: '❌ <b>Error</b>',
      generic: 'Failed to process request',
      tryAgain: 'Try again or send different text/URL',
      contactSupport: 'If problem persists, contact support',
    },
    
    styles: {
      journalistic: '📰 Journalistic',
      technical: '⚙️ Technical',
      casual: '💬 Casual',
      educational: '🎓 Educational',
      analytical: '📊 Analytical',
      keepAsIs: '✋ Keep As Is',
    },
    
    seconds: 'seconds',
    enabled: 'Enabled',
    disabled: 'Disabled',
  },
  
  // 🇵🇱 POLISH
  pl: {
    commands: {
      start: '▶️ /start - Rozpocznij',
      help: '❓ /help - Pomoc',
      settings: '⚙️ /settings - Ustawienia',
      language: '🌐 /language - Język interfejsu',
    },
    
    welcome: {
      title: '👋 Witaj w icoffio Bot!',
      description: 'Pomagam tworzyć artykuły z tekstu lub URL.',
      howTo: '<b>📝 Jak używać:</b>\n1️⃣ Wyślij URL artykułu\n2️⃣ Lub napisz tekst\n3️⃣ Stworzę artykuł EN + PL',
      commands: '<b>📋 Komendy:</b>',
    },
    
    help: {
      title: '❓ <b>Pomoc</b>',
      description: 'Bot automatycznie tworzy artykuły dwujęzyczne (EN + PL) z tekstu lub URL.',
      urlExample: '<b>📌 Przykład URL:</b>\nhttps://techcrunch.com/article',
      textExample: '<b>📌 Przykład tekstu:</b>\nGoogle ogłasza nowe funkcje AI...',
      availableCommands: '<b>📋 Dostępne komendy:</b>',
    },
    
    settings: {
      title: '⚙️ <b>Twoje ustawienia:</b>',
      currentSettings: '<b>Obecne ustawienia:</b>',
      contentStyle: '📝 Styl treści',
      images: '🖼️ Obrazy',
      autoPublish: '📤 Auto-publikacja',
      language: '🌐 Język interfejsu',
      changeInAdmin: '\n💡 <i>Zmień ustawienia:</i>\napp.icoffio.com/en/admin → 🤖 Telegram',
    },
    
    languageSelection: {
      title: '🌐 <b>Język interfejsu bota</b>',
      current: 'Obecny język',
      choose: 'Wybierz język:',
      changed: '✅ Język interfejsu zmieniony na',
    },
    
    processing: {
      title: '⏳ <b>Przetwarzam...</b>',
      parsingUrl: '🔗 Parsowanie URL',
      processingText: '📝 Przetwarzanie tekstu',
      style: '📝 Styl',
      images: '🖼️ Obrazy',
      estimatedTime: '⏱️ Szacowany czas',
    },
    
    success: {
      published: '✅ OPUBLIKOWANO',
      savedAsDraft: '💾 ZAPISANO JAKO SZKIC',
      title: '📝 <b>Tytuł:</b>',
      statistics: '📊 <b>Statystyki:</b>',
      style: '• Styl',
      words: '• Słowa',
      imagesCount: '• Obrazy',
      category: '• Kategoria',
      time: '• Czas',
      links: '🔗 <b>Linki:</b>',
      note: {
        published: '✅ Artykuł dostępny pod powyższymi linkami',
        draft: '💾 Szkic zapisany. Opublikuj w panelu admin',
      },
      editLink: '🎨 Edytuj',
    },
    
    error: {
      title: '❌ <b>Błąd</b>',
      generic: 'Nie udało się przetworzyć żądania',
      tryAgain: 'Spróbuj ponownie lub wyślij inny tekst/URL',
      contactSupport: 'Jeśli problem się powtarza, skontaktuj się z pomocą techniczną',
    },
    
    styles: {
      journalistic: '📰 Journalistic',
      technical: '⚙️ Technical',
      casual: '💬 Casual',
      educational: '🎓 Educational',
      analytical: '📊 Analytical',
      keepAsIs: '✋ Keep As Is',
    },
    
    seconds: 'sekund',
    enabled: 'Włączono',
    disabled: 'Wyłączono',
  },
};

/**
 * Get translations for specified language
 */
export function getTranslations(language: BotLanguage = 'ru'): BotTranslations {
  return translations[language] || translations.ru;
}

/**
 * Get language name in that language
 */
export function getLanguageName(language: BotLanguage): string {
  const names: Record<BotLanguage, string> = {
    ru: '🇷🇺 Русский',
    en: '🇬🇧 English',
    pl: '🇵🇱 Polski',
  };
  return names[language];
}


