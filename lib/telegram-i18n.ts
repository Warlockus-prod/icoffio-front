/**
 * TELEGRAM BOT INTERNATIONALIZATION
 * 
 * Multi-language support for Telegram bot interface
 * Supported languages: Russian, Polish, English
 */

export type BotLanguage = 'ru' | 'pl' | 'en';

// In-memory storage for user language preferences
// In production, use database or Redis
const userLanguages = new Map<number, BotLanguage>();

/**
 * Get user's preferred language
 */
export function getUserLanguage(chatId: number): BotLanguage {
  return userLanguages.get(chatId) || 'ru'; // Default: Russian
}

/**
 * Set user's preferred language
 */
export function setUserLanguage(chatId: number, language: BotLanguage): void {
  userLanguages.set(chatId, language);
}

/**
 * All bot messages in 3 languages
 */
export const translations: Record<BotLanguage, {
  // Commands
  start: string;
  help: string;
  helpDetails: string;
  queue: string;
  status: string;
  language: string;
  languagePrompt: string;
  languageChanged: string;
  unknownCommand: string;

  // Processing messages
  textReceived: string;
  urlReceived: string;
  addedToQueue: string;
  aiGenerating: string;
  pleaseWait: string;

  // Success messages
  published: string;
  title: string;
  words: string;
  languages: string;
  time: string;
  statusPublished: string;
  category: string;

  // Error messages
  error: string;
  jobNotFound: string;
  createdNotPublished: string;
  checkSettings: string;
  errorAiGeneration: string;
  errorUrlParsing: string;
  errorPublication: string;
  errorProcessing: string;
  timeout: string;
  checkLater: string;

  // Queue status
  queueStatus: string;
  totalJobs: string;
  pending: string;
  processing: string;
  completed: string;
  errors: string;
  systemWorking: string;
  systemWaiting: string;

  // System status
  systemActive: string;
  aiModel: string;
  images: string;
  languagesSupported: string;
  queueActive: string;
  allSystemsNormal: string;
}> = {
  ru: {
    // Commands
    start: '👋 <b>Привет! Я icoffio Bot</b>\n\n' +
           'Я помогу тебе создавать статьи:\n\n' +
           '📝 <b>Отправь текст</b> → Создам статью с AI\n' +
           '🔗 <b>Отправь URL</b> → Спарсю и опубликую\n\n' +
           '📋 <b>Команды:</b>\n' +
           '/help - Помощь\n' +
           '/queue - Статус очереди\n' +
           '/status - Мой статус\n' +
           '/language - Выбор языка\n\n' +
           'Powered by GPT-4o 🤖',
    help: '📖 <b>Как использовать бота:</b>',
    helpDetails: '<b>1. Создание статьи из текста</b>\n' +
                 'Просто отправь текст (1-2 предложения или полный текст).\n' +
                 'AI создаст профессиональную статью.\n\n' +
                 '<b>2. Парсинг статьи с URL</b>\n' +
                 'Отправь ссылку на статью.\n' +
                 'Бот спарсит и добавит в систему.\n\n' +
                 '<b>3. Очередь запросов</b>\n' +
                 'Если отправишь несколько запросов — они обработаются по очереди.\n\n' +
                 '<b>Команды:</b>\n' +
                 '/start - Начало работы\n' +
                 '/queue - Посмотреть очередь\n' +
                 '/status - Статус системы\n' +
                 '/language - Выбор языка',
    queue: '📊 <b>Статус очереди:</b>',
    status: '✅ <b>Система активна</b>',
    language: '🌍 <b>Выбор языка интерфейса</b>',
    languagePrompt: 'Выберите язык:\n' +
                    '🇷🇺 Русский - /lang_ru\n' +
                    '🇵🇱 Polski - /lang_pl\n' +
                    '🇬🇧 English - /lang_en',
    languageChanged: '✅ Язык изменен на Русский',
    unknownCommand: '❓ Неизвестная команда',

    // Processing
    textReceived: '✨ <b>Текст получен!</b>',
    urlReceived: '🔄 <b>URL получен!</b>',
    addedToQueue: '📋 Добавлено в очередь:',
    aiGenerating: '🤖 AI генерирует статью...',
    pleaseWait: '⏳ Ожидайте (~60 секунд)',

    // Success
    published: '✅ <b>ОПУБЛИКОВАНО!</b>',
    title: '📝 <b>Заголовок:</b>',
    words: '💬 <b>Слов:</b>',
    languages: '🌍 <b>Языки:</b>',
    time: '⏱️ <b>Время:</b>',
    statusPublished: '✨ <b>Статус:</b> Опубликовано на сайте!',
    category: '📁 <b>Категория:</b>',

    // Errors
    error: '❌ <b>Ошибка</b>',
    jobNotFound: 'Задание не найдено. Попробуйте снова.',
    createdNotPublished: '✅ <b>Создано (не опубликовано)</b>',
    checkSettings: 'Проверьте настройки WordPress.',
    errorAiGeneration: '❌ <b>Ошибка AI генерации</b>\n\nНе удалось создать контент статьи.',
    errorUrlParsing: '❌ <b>Ошибка парсинга URL</b>\n\nНе удалось получить контент по ссылке.',
    errorPublication: '❌ <b>Ошибка публикации</b>\n\nСтатья создана, но не опубликована.',
    errorProcessing: '❌ <b>Ошибка обработки</b>',
    timeout: '⏱️ <b>Timeout</b>\n\nОбработка занимает слишком много времени.',
    checkLater: 'Проверьте статус позже командой /queue',

    // Queue status
    queueStatus: '📊 <b>Статус очереди:</b>',
    totalJobs: '📋 Всего заданий:',
    pending: '⏳ В ожидании:',
    processing: '⚙️ Обрабатывается:',
    completed: '✅ Завершено:',
    errors: '❌ Ошибки:',
    systemWorking: '🔄 Система работает',
    systemWaiting: '💤 Система ожидает',

    // System status
    systemActive: '✅ <b>Система активна</b>',
    aiModel: '🤖 AI: GPT-4o',
    images: '🎨 Изображения: DALL-E 3 + Unsplash',
    languagesSupported: '🌍 Языки: RU, EN, PL',
    queueActive: '📊 Queue: Активна',
    allSystemsNormal: 'Все системы работают нормально!'
  },
  
  pl: {
    // Commands
    start: '👋 <b>Cześć! Jestem icoffio Bot</b>\n\n' +
           'Pomogę Ci tworzyć artykuły:\n\n' +
           '📝 <b>Wyślij tekst</b> → Stworzę artykuł z AI\n' +
           '🔗 <b>Wyślij URL</b> → Spparsuję i opublikuję\n\n' +
           '📋 <b>Komendy:</b>\n' +
           '/help - Pomoc\n' +
           '/queue - Status kolejki\n' +
           '/status - Mój status\n' +
           '/language - Wybór języka\n\n' +
           'Powered by GPT-4o 🤖',
    help: '📖 <b>Jak używać bota:</b>',
    helpDetails: '<b>1. Tworzenie artykułu z tekstu</b>\n' +
                 'Po prostu wyślij tekst (1-2 zdania lub pełny tekst).\n' +
                 'AI stworzy profesjonalny artykuł.\n\n' +
                 '<b>2. Parsowanie artykułu z URL</b>\n' +
                 'Wyślij link do artykułu.\n' +
                 'Bot sparsuje i doda do systemu.\n\n' +
                 '<b>3. Kolejka zapytań</b>\n' +
                 'Jeśli wyślesz kilka zapytań — będą przetwarzane po kolei.\n\n' +
                 '<b>Komendy:</b>\n' +
                 '/start - Początek pracy\n' +
                 '/queue - Zobacz kolejkę\n' +
                 '/status - Status systemu\n' +
                 '/language - Wybór języka',
    queue: '📊 <b>Status kolejki:</b>',
    status: '✅ <b>System aktywny</b>',
    language: '🌍 <b>Wybór języka interfejsu</b>',
    languagePrompt: 'Wybierz język:\n' +
                    '🇷🇺 Русский - /lang_ru\n' +
                    '🇵🇱 Polski - /lang_pl\n' +
                    '🇬🇧 English - /lang_en',
    languageChanged: '✅ Język zmieniony na Polski',
    unknownCommand: '❓ Nieznana komenda',

    // Processing
    textReceived: '✨ <b>Tekst otrzymany!</b>',
    urlReceived: '🔄 <b>URL otrzymany!</b>',
    addedToQueue: '📋 Dodano do kolejki:',
    aiGenerating: '🤖 AI generuje artykuł...',
    pleaseWait: '⏳ Proszę czekać (~60 sekund)',

    // Success
    published: '✅ <b>OPUBLIKOWANO!</b>',
    title: '📝 <b>Tytuł:</b>',
    words: '💬 <b>Słowa:</b>',
    languages: '🌍 <b>Języki:</b>',
    time: '⏱️ <b>Czas:</b>',
    statusPublished: '✨ <b>Status:</b> Opublikowano na stronie!',
    category: '📁 <b>Kategoria:</b>',

    // Errors
    error: '❌ <b>Błąd</b>',
    jobNotFound: 'Zadanie nie znalezione. Spróbuj ponownie.',
    createdNotPublished: '✅ <b>Utworzono (nie opublikowano)</b>',
    checkSettings: 'Sprawdź ustawienia WordPress.',
    errorAiGeneration: '❌ <b>Błąd generacji AI</b>\n\nNie udało się utworzyć treści artykułu.',
    errorUrlParsing: '❌ <b>Błąd parsowania URL</b>\n\nNie udało się pobrać treści z linku.',
    errorPublication: '❌ <b>Błąd publikacji</b>\n\nArtykuł utworzony, ale nie opublikowany.',
    errorProcessing: '❌ <b>Błąd przetwarzania</b>',
    timeout: '⏱️ <b>Timeout</b>\n\nPrzetwarzanie trwa zbyt długo.',
    checkLater: 'Sprawdź status później komendą /queue',

    // Queue status
    queueStatus: '📊 <b>Status kolejki:</b>',
    totalJobs: '📋 Wszystkie zadania:',
    pending: '⏳ Oczekujące:',
    processing: '⚙️ Przetwarzane:',
    completed: '✅ Zakończone:',
    errors: '❌ Błędy:',
    systemWorking: '🔄 System pracuje',
    systemWaiting: '💤 System oczekuje',

    // System status
    systemActive: '✅ <b>System aktywny</b>',
    aiModel: '🤖 AI: GPT-4o',
    images: '🎨 Obrazy: DALL-E 3 + Unsplash',
    languagesSupported: '🌍 Języki: RU, EN, PL',
    queueActive: '📊 Queue: Aktywna',
    allSystemsNormal: 'Wszystkie systemy działają normalnie!'
  },

  en: {
    // Commands
    start: '👋 <b>Hello! I\'m icoffio Bot</b>\n\n' +
           'I\'ll help you create articles:\n\n' +
           '📝 <b>Send text</b> → I\'ll create an article with AI\n' +
           '🔗 <b>Send URL</b> → I\'ll parse and publish\n\n' +
           '📋 <b>Commands:</b>\n' +
           '/help - Help\n' +
           '/queue - Queue status\n' +
           '/status - My status\n' +
           '/language - Language selection\n\n' +
           'Powered by GPT-4o 🤖',
    help: '📖 <b>How to use the bot:</b>',
    helpDetails: '<b>1. Create article from text</b>\n' +
                 'Just send text (1-2 sentences or full text).\n' +
                 'AI will create a professional article.\n\n' +
                 '<b>2. Parse article from URL</b>\n' +
                 'Send a link to an article.\n' +
                 'Bot will parse and add to the system.\n\n' +
                 '<b>3. Request queue</b>\n' +
                 'If you send multiple requests — they will be processed in order.\n\n' +
                 '<b>Commands:</b>\n' +
                 '/start - Start working\n' +
                 '/queue - View queue\n' +
                 '/status - System status\n' +
                 '/language - Language selection',
    queue: '📊 <b>Queue status:</b>',
    status: '✅ <b>System active</b>',
    language: '🌍 <b>Interface language selection</b>',
    languagePrompt: 'Choose language:\n' +
                    '🇷🇺 Русский - /lang_ru\n' +
                    '🇵🇱 Polski - /lang_pl\n' +
                    '🇬🇧 English - /lang_en',
    languageChanged: '✅ Language changed to English',
    unknownCommand: '❓ Unknown command',

    // Processing
    textReceived: '✨ <b>Text received!</b>',
    urlReceived: '🔄 <b>URL received!</b>',
    addedToQueue: '📋 Added to queue:',
    aiGenerating: '🤖 AI generating article...',
    pleaseWait: '⏳ Please wait (~60 seconds)',

    // Success
    published: '✅ <b>PUBLISHED!</b>',
    title: '📝 <b>Title:</b>',
    words: '💬 <b>Words:</b>',
    languages: '🌍 <b>Languages:</b>',
    time: '⏱️ <b>Time:</b>',
    statusPublished: '✨ <b>Status:</b> Published on the site!',
    category: '📁 <b>Category:</b>',

    // Errors
    error: '❌ <b>Error</b>',
    jobNotFound: 'Job not found. Try again.',
    createdNotPublished: '✅ <b>Created (not published)</b>',
    checkSettings: 'Check WordPress settings.',
    errorAiGeneration: '❌ <b>AI generation error</b>\n\nFailed to create article content.',
    errorUrlParsing: '❌ <b>URL parsing error</b>\n\nFailed to get content from the link.',
    errorPublication: '❌ <b>Publication error</b>\n\nArticle created but not published.',
    errorProcessing: '❌ <b>Processing error</b>',
    timeout: '⏱️ <b>Timeout</b>\n\nProcessing is taking too long.',
    checkLater: 'Check status later with /queue command',

    // Queue status
    queueStatus: '📊 <b>Queue status:</b>',
    totalJobs: '📋 Total jobs:',
    pending: '⏳ Pending:',
    processing: '⚙️ Processing:',
    completed: '✅ Completed:',
    errors: '❌ Errors:',
    systemWorking: '🔄 System working',
    systemWaiting: '💤 System waiting',

    // System status
    systemActive: '✅ <b>System active</b>',
    aiModel: '🤖 AI: GPT-4o',
    images: '🎨 Images: DALL-E 3 + Unsplash',
    languagesSupported: '🌍 Languages: RU, EN, PL',
    queueActive: '📊 Queue: Active',
    allSystemsNormal: 'All systems operating normally!'
  }
};

/**
 * Get translated message
 */
export function t(chatId: number, key: keyof typeof translations['ru']): string {
  const lang = getUserLanguage(chatId);
  return translations[lang][key];
}

