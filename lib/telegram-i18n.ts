/**
 * TELEGRAM BOT INTERNATIONALIZATION
 * 
 * Multi-language support for Telegram bot interface
 * Supported languages: Russian, Polish, English
 * 
 * NOTE: Uses in-memory cache + Supabase database for persistence
 */

import { telegramDB } from './telegram-database-service';

export type BotLanguage = 'ru' | 'pl' | 'en';

// In-memory cache for fast access (populated from DB)
// This cache resets on Vercel function cold start, but DB persists
const languageCache = new Map<number, BotLanguage>();

/**
 * Get user's preferred language (cached + DB fallback)
 */
export function getUserLanguage(chatId: number): BotLanguage {
  // Try cache first (fast)
  const cached = languageCache.get(chatId);
  if (cached) {
    return cached;
  }

  // Cache miss - will load from DB on next interaction
  // For now return default
  return 'ru'; // Default: Russian
}

/**
 * Set user's preferred language (cache + DB)
 */
export function setUserLanguage(chatId: number, language: BotLanguage): void {
  languageCache.set(chatId, language);
  // DB update happens separately in webhook/route.ts
}

/**
 * Load user language from database and cache it
 * Called on first message from user
 */
export async function loadUserLanguage(chatId: number): Promise<BotLanguage> {
  try {
    const language = await telegramDB.getUserLanguage(chatId);
    languageCache.set(chatId, language);
    return language;
  } catch (error) {
    console.error('[i18n] Failed to load user language from DB:', error);
    return 'ru'; // Default fallback
  }
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

  // Compose mode commands
  compose: string;
  composeStarted: string;
  composeInfo: string;
  publish: string;
  cancel: string;
  composeCancelled: string;
  notInComposeMode: string;
  composeEmpty: string;
  composeStats: string;

  // Delete command
  deleteCommand: string;
  deletePrompt: string;
  deleteSuccess: string;
  deleteError: string;
  invalidArticleUrl: string;

  // Inline buttons
  btnAddMore: string;
  btnPublishNow: string;

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
           '/compose - Режим составления\n' +
           '/delete - Удалить статью\n' +
           '/queue - Статус очереди\n' +
           '/status - Мой статус\n' +
           '/language - Выбор языка\n\n' +
           'Powered by GPT-4o 🤖',
    help: '📖 <b>Как использовать бота:</b>',
    helpDetails: '<b>1. Создание статьи из текста</b>\n' +
                 'Просто отправь текст (1-2 предложения или полный текст).\n' +
                 'AI создаст профессиональную статью.\n\n' +
                 '<b>2. Режим составления (для длинных статей)</b>\n' +
                 '/compose - Начать составление\n' +
                 'Отправляй несколько сообщений подряд\n' +
                 '/publish - Опубликовать все вместе\n' +
                 '/cancel - Отменить составление\n\n' +
                 '<b>3. Парсинг статьи с URL</b>\n' +
                 'Отправь ссылку на статью.\n' +
                 'Бот спарсит и добавит в систему.\n\n' +
                 '<b>4. Удаление статьи</b>\n' +
                 '/delete - Отправь ссылку на статью для удаления\n\n' +
                 '<b>Команды:</b>\n' +
                 '/start - Начало работы\n' +
                 '/compose - Режим составления\n' +
                 '/publish - Опубликовать составленное\n' +
                 '/cancel - Отменить\n' +
                 '/delete - Удалить статью\n' +
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

    // Compose mode
    compose: '📝 <b>Режим составления активирован</b>',
    composeStarted: '✍️ Теперь отправляй сообщения одно за другим.\n' +
                    'Я объединю их в одну статью.\n\n' +
                    '📋 <b>Команды:</b>\n' +
                    '/publish - Опубликовать все\n' +
                    '/cancel - Отменить',
    composeInfo: '📊 <b>Накоплено:</b>',
    publish: '✅ <b>Публикую составленную статью...</b>',
    cancel: '❌ <b>Отменено</b>',
    composeCancelled: 'Режим составления отменен. Все сообщения удалены.',
    notInComposeMode: '⚠️ Вы не в режиме составления.\n\nИспользуйте /compose чтобы начать.',
    composeEmpty: '⚠️ Нет накопленных сообщений.\n\nОтправьте текст после команды /compose',
    composeStats: 'Сообщений: {count}\nСимволов: {length}\nВремя: {duration} сек',

    // Delete command
    deleteCommand: '🗑️ <b>Удаление статьи</b>',
    deletePrompt: 'Отправьте ссылку на статью для удаления:\n\n' +
                  'Например:\n' +
                  'https://app.icoffio.com/en/article/my-article-en\n' +
                  'https://app.icoffio.com/pl/article/my-article-pl',
    deleteSuccess: '✅ <b>Статья удалена!</b>\n\n' +
                   '📝 Slug: {slug}\n' +
                   '🌍 Язык: {lang}',
    deleteError: '❌ <b>Ошибка удаления</b>\n\n{error}',
    invalidArticleUrl: '❌ <b>Неверная ссылка</b>\n\n' +
                       'Ссылка должна быть в формате:\n' +
                       'https://app.icoffio.com/[язык]/article/[slug]',

    // Inline buttons
    btnAddMore: '📝 Добавить еще',
    btnPublishNow: '✅ Опубликовать сейчас',

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
           '/compose - Tryb komponowania\n' +
           '/delete - Usuń artykuł\n' +
           '/queue - Status kolejki\n' +
           '/status - Mój status\n' +
           '/language - Wybór języka\n\n' +
           'Powered by GPT-4o 🤖',
    help: '📖 <b>Jak używać bota:</b>',
    helpDetails: '<b>1. Tworzenie artykułu z tekstu</b>\n' +
                 'Po prostu wyślij tekst (1-2 zdania lub pełny tekst).\n' +
                 'AI stworzy profesjonalny artykuł.\n\n' +
                 '<b>2. Tryb komponowania (dla długich artykułów)</b>\n' +
                 '/compose - Rozpocznij komponowanie\n' +
                 'Wysyłaj kilka wiadomości po kolei\n' +
                 '/publish - Opublikuj wszystko razem\n' +
                 '/cancel - Anuluj komponowanie\n\n' +
                 '<b>3. Parsowanie artykułu z URL</b>\n' +
                 'Wyślij link do artykułu.\n' +
                 'Bot sparsuje i doda do systemu.\n\n' +
                 '<b>4. Usuwanie artykułu</b>\n' +
                 '/delete - Wyślij link do artykułu do usunięcia\n\n' +
                 '<b>Komendy:</b>\n' +
                 '/start - Początek pracy\n' +
                 '/compose - Tryb komponowania\n' +
                 '/publish - Opublikuj skomponowane\n' +
                 '/cancel - Anuluj\n' +
                 '/delete - Usuń artykuł\n' +
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

    // Compose mode
    compose: '📝 <b>Tryb komponowania aktywowany</b>',
    composeStarted: '✍️ Teraz wysyłaj wiadomości jedną po drugiej.\n' +
                    'Połączę je w jeden artykuł.\n\n' +
                    '📋 <b>Komendy:</b>\n' +
                    '/publish - Opublikuj wszystko\n' +
                    '/cancel - Anuluj',
    composeInfo: '📊 <b>Zgromadzono:</b>',
    publish: '✅ <b>Publikuję skomponowany artykuł...</b>',
    cancel: '❌ <b>Anulowano</b>',
    composeCancelled: 'Tryb komponowania anulowany. Wszystkie wiadomości usunięte.',
    notInComposeMode: '⚠️ Nie jesteś w trybie komponowania.\n\nUżyj /compose aby rozpocząć.',
    composeEmpty: '⚠️ Brak zgromadzonych wiadomości.\n\nWyślij tekst po komendzie /compose',
    composeStats: 'Wiadomości: {count}\nZnaków: {length}\nCzas: {duration} sek',

    // Delete command
    deleteCommand: '🗑️ <b>Usuwanie artykułu</b>',
    deletePrompt: 'Wyślij link do artykułu do usunięcia:\n\n' +
                  'Na przykład:\n' +
                  'https://app.icoffio.com/en/article/my-article-en\n' +
                  'https://app.icoffio.com/pl/article/my-article-pl',
    deleteSuccess: '✅ <b>Artykuł usunięty!</b>\n\n' +
                   '📝 Slug: {slug}\n' +
                   '🌍 Język: {lang}',
    deleteError: '❌ <b>Błąd usuwania</b>\n\n{error}',
    invalidArticleUrl: '❌ <b>Nieprawidłowy link</b>\n\n' +
                       'Link powinien być w formacie:\n' +
                       'https://app.icoffio.com/[język]/article/[slug]',

    // Inline buttons
    btnAddMore: '📝 Dodaj więcej',
    btnPublishNow: '✅ Opublikuj teraz',

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
           '/compose - Compose mode\n' +
           '/delete - Delete article\n' +
           '/queue - Queue status\n' +
           '/status - My status\n' +
           '/language - Language selection\n\n' +
           'Powered by GPT-4o 🤖',
    help: '📖 <b>How to use the bot:</b>',
    helpDetails: '<b>1. Create article from text</b>\n' +
                 'Just send text (1-2 sentences or full text).\n' +
                 'AI will create a professional article.\n\n' +
                 '<b>2. Compose mode (for long articles)</b>\n' +
                 '/compose - Start composing\n' +
                 'Send multiple messages in a row\n' +
                 '/publish - Publish everything together\n' +
                 '/cancel - Cancel composing\n\n' +
                 '<b>3. Parse article from URL</b>\n' +
                 'Send a link to an article.\n' +
                 'Bot will parse and add to the system.\n\n' +
                 '<b>4. Delete article</b>\n' +
                 '/delete - Send article link to delete\n\n' +
                 '<b>Commands:</b>\n' +
                 '/start - Start working\n' +
                 '/compose - Compose mode\n' +
                 '/publish - Publish composed\n' +
                 '/cancel - Cancel\n' +
                 '/delete - Delete article\n' +
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

    // Compose mode
    compose: '📝 <b>Compose mode activated</b>',
    composeStarted: '✍️ Now send messages one after another.\n' +
                    'I\'ll combine them into one article.\n\n' +
                    '📋 <b>Commands:</b>\n' +
                    '/publish - Publish everything\n' +
                    '/cancel - Cancel',
    composeInfo: '📊 <b>Accumulated:</b>',
    publish: '✅ <b>Publishing composed article...</b>',
    cancel: '❌ <b>Cancelled</b>',
    composeCancelled: 'Compose mode cancelled. All messages deleted.',
    notInComposeMode: '⚠️ You are not in compose mode.\n\nUse /compose to start.',
    composeEmpty: '⚠️ No accumulated messages.\n\nSend text after /compose command',
    composeStats: 'Messages: {count}\nCharacters: {length}\nTime: {duration} sec',

    // Delete command
    deleteCommand: '🗑️ <b>Delete article</b>',
    deletePrompt: 'Send article link to delete:\n\n' +
                  'For example:\n' +
                  'https://app.icoffio.com/en/article/my-article-en\n' +
                  'https://app.icoffio.com/pl/article/my-article-pl',
    deleteSuccess: '✅ <b>Article deleted!</b>\n\n' +
                   '📝 Slug: {slug}\n' +
                   '🌍 Language: {lang}',
    deleteError: '❌ <b>Deletion error</b>\n\n{error}',
    invalidArticleUrl: '❌ <b>Invalid link</b>\n\n' +
                       'Link should be in format:\n' +
                       'https://app.icoffio.com/[language]/article/[slug]',

    // Inline buttons
    btnAddMore: '📝 Add more',
    btnPublishNow: '✅ Publish now',

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

