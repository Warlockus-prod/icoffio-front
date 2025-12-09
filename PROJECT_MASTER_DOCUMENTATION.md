# 📚 ICOFFIO PROJECT - MASTER DOCUMENTATION

**Версия:** v7.28.1 (Admin Panel Complete + Multi-Image)  
**Дата:** 2025-12-05  
**Статус:** ✅ PRODUCTION READY

## 🔄 ПОСЛЕДНИЕ ОБНОВЛЕНИЯ v7.28.1

### 🔥 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ v7.28.1:

1. **SUPABASE PERSISTENCE** - исправлены 404 ошибки
   - Runtime storage НЕ работает в serverless (разные инстансы!)
   - Статьи теперь сохраняются в Supabase published_articles
   - Slug с суффиксами: `slug-name-en`, `slug-name-pl` (система требует!)
   - Файл: `app/api/articles/route.ts` - полная интеграция с Supabase

2. **МНОЖЕСТВЕННЫЙ ВЫБОР ИЗОБРАЖЕНИЙ (1-3 шт)**
   - Можно выбрать 2-3 изображения одновременно (не только одно!)
   - Toggle режим: кликай на картинку чтобы добавить/убрать
   - Первое = primary image, остальные = additional images[]
   - Кнопка "Применить (N)" показывает количество
   - Максимум 3 изображения за раз
   - Файл: `components/admin/ImageSelectionModal.tsx`

3. **PREVIEW ПОКАЗЫВАЕТ ОБЕ ВЕРСИИ СРАЗУ**
   - Split View по умолчанию (EN слева, PL справа)
   - Видно оба перевода одновременно
   - Можно переключиться на Single View для фокуса
   - Файл: `components/admin/ArticleEditor/ArticlePreview.tsx`

---

## 🔄 ПРЕДЫДУЩИЕ ОБНОВЛЕНИЯ v7.28.0

### ✅ КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ АДМИН ПАНЕЛИ:

1. **Переводы EN + PL** - теперь работают автоматически при парсинге
2. **Удаление двойных кавычек** - GPT больше не добавляет лишние кавычки
3. **3 варианта изображений** - выбор из Unsplash при создании статьи
4. **Публикация исправлена** - правильные slug'и без суффиксов -en/-pl
5. **Редактирование работает** - WYSIWYG + Markdown редактор с auto-save
6. **🔥 КРИТИЧНО: Editor показывает EN** - русская статья автоматически переводится на EN и PL, в editor показывается АНГЛИЙСКАЯ версия

### 🎯 КЛЮЧЕВАЯ ЛОГИКА (v7.28.0):

**Что происходит при парсинге русской статьи:**
1. Парсится русский URL → определяется язык (RU) через detectLanguage()
2. **Автоматический перевод на EN** через OpenAI GPT-4o-mini
3. **finalArticleData = английская версия** (становится основной)
4. **Автоматический перевод на PL** из английской версии
5. В Editor показывается **АНГЛИЙСКАЯ версия** (не русская!)
6. Русская версия нигде не сохраняется и не показывается
7. Админ работает с EN версией, может переключиться на PL

**Критичные файлы и строки:**

1. **lib/translation-service.ts** (строки 224-250)
   - Определение языка по ключевым словам + % кириллицы
   - Если >30% кириллица → автоматически RU
   
2. **lib/unified-article-service.ts** (строки 209-240)
   - Перевод на EN: finalArticleData с language='en'
   - Перевод на PL: translations.pl
   - articleData = finalArticleData (EN становится основной)
   - **Slug'и:** `${baseSlug}-en` и `${baseSlug}-pl` (суффиксы обязательны!)

3. **lib/stores/admin-store.ts** (строки 538-542)
   - Всегда берет posts.en как основную статью
   - article.title = enPost.title (английский!)
   - article.content = enPost.content (английский!)

4. **app/api/articles/route.ts** (строки 740-790)
   - Публикация с суффиксами: enSlug = `${baseSlug}-en`
   - plSlug = `${baseSlug}-pl`
   - formatPostsForAdmin(): posts.en из основной статьи
   - Детальное логирование для отладки

**⚠️ ВАЖНО:** Система фильтрации требует суффиксы -en/-pl в slug'ах!
- Без суффиксов статьи не находятся (404 ошибка)
- data.ts использует `article.slug.includes('-${locale}')`

### 📁 Измененные файлы:
- `lib/translation-service.ts` - очистка кавычек, улучшенная обработка GPT
- `lib/unified-article-service.ts` - генерация 3 изображений, исправлены переводы
- `lib/stores/admin-store.ts` - **EN как основная**, сохранение imageOptions
- `app/api/articles/route.ts` - правильная публикация с одинаковыми slug
- `components/admin/PublishingQueue.tsx` - toast с рабочими ссылками

---

---

## 📖 СОДЕРЖАНИЕ

1. [О проекте](#о-проекте)
2. [Архитектура](#архитектура)
3. [Технологический стек](#технологический-стек)
4. [Структура проекта](#структура-проекта)
5. [Основные компоненты](#основные-компоненты)
6. [API Endpoints](#api-endpoints)
7. [База данных (Supabase)](#база-данных-supabase)
8. [Deployment](#deployment)
9. [Configured Services & Domains](#configured-services--domains) ⭐ **НОВОЕ**
10. [Connected Services](#connected-services) ⭐ **НОВОЕ**
11. [Environment Variables](#environment-variables)
12. [Правила разработки](#правила-разработки)
13. [Документация](#документация)
14. [История версий](#история-версий)

---

## 🎯 О ПРОЕКТЕ

**icoffio** - многоязычная новостная платформа о технологиях с автоматической генерацией контента через Telegram бота и AI.

### Ключевые возможности:

- ✅ **Dual-Language Publishing** - автоматическая публикация на EN + PL
- ✅ **Telegram Bot** - создание статей через чат
- ✅ **AI Content Generation** - OpenAI GPT-4 для генерации
- ✅ **Image Generation** - AI + Unsplash интеграция
- ✅ **Next.js Admin Panel** - управление контентом
- ✅ **Supabase Storage** - быстрое хранилище статей
- ✅ **SSR + ISR** - отличное SEO и производительность
- ✅ **Multi-language** - EN, PL (расширяемо)

### Целевая аудитория:

- Технические новости и статьи
- Англоязычная и польскоязычная аудитория
- Фокус на AI, технологии, гаджеты

---

## 🏗️ АРХИТЕКТУРА

### Общая архитектура (v7.14.0):

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (app.icoffio.com)                  │   │
│  │  - SSR/ISR для SEO                                   │   │
│  │  - Tailwind CSS для стилей                           │   │
│  │  - React компоненты                                  │   │
│  │  - Multi-language routing (/en, /pl)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes                                  │   │
│  │  - /api/admin/publish-article    (публикация)       │   │
│  │  - /api/supabase-articles        (чтение)           │   │
│  │  - /api/telegram/webhook         (Telegram)         │   │
│  │  - /api/admin/generate-article   (AI генерация)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            ↓ ↑                          ↓ ↑
┌─────────────────────┐      ┌─────────────────────────────┐
│  EXTERNAL SERVICES  │      │     DATA LAYER              │
│                     │      │                             │
│  ┌──────────────┐   │      │  ┌───────────────────────┐ │
│  │ Telegram Bot │   │      │  │   Supabase            │ │
│  │  (Webhook)   │   │      │  │  PostgreSQL Database  │ │
│  └──────────────┘   │      │  │                       │ │
│                     │      │  │  Tables:              │ │
│  ┌──────────────┐   │      │  │  - published_articles │ │
│  │  OpenAI      │   │      │  │  - telegram_jobs      │ │
│  │  GPT-4       │   │      │  │  - article_views      │ │
│  └──────────────┘   │      │  │  - telegram_prefs     │ │
│                     │      │  │  - image_library      │ │
│  ┌──────────────┐   │      │  └───────────────────────┘ │
│  │  Unsplash    │   │      │                             │
│  │  Images API  │   │      │  ✅ Direct Storage          │
│  └──────────────┘   │      │  ✅ Fast Queries            │
│                     │      │  ✅ Full-text Search        │
└─────────────────────┘      └─────────────────────────────┘
```

### Принципы архитектуры:

1. **Serverless-First** - Vercel Edge Functions
2. **Direct Database Access** - Supabase вместо WordPress
3. **JAMstack** - Static + Dynamic через ISR
4. **Headless CMS** - Decoupled frontend/backend
5. **API-First** - Все через REST API

---

## 🛠️ ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Frontend:

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Next.js** | 14.x | React framework, SSR/ISR |
| **React** | 18.x | UI библиотека |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **React Hot Toast** | 2.4.1 | Notifications |
| **TipTap** | 2.1.x | WYSIWYG editor |
| **Zustand** | 4.x | State management |

### Backend & Services:

| Сервис | Назначение |
|--------|------------|
| **Supabase** | PostgreSQL database, Storage |
| **Vercel** | Hosting, Edge Functions, CI/CD |
| **OpenAI GPT-4** | AI content generation |
| **Unsplash** | Image provider |
| **Telegram Bot API** | User interface для создания контента |

### Инфраструктура:

| Компонент | Провайдер | План |
|-----------|-----------|------|
| **Hosting** | Vercel | Pro ($20/мес) |
| **Database** | Supabase | Free → Pro ($25/мес) |
| **CDN** | Vercel Edge Network | Включено |
| **DNS** | Cloudflare | Free |
| **Domain** | icoffio.com, app.icoffio.com | - |

### Зависимости (package.json):

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "openai": "^4.20.0",
    "marked": "^11.0.0",
    "react-hot-toast": "^2.4.1",
    "@tiptap/react": "^2.1.13",
    "@tiptap/starter-kit": "^2.1.13",
    "@tiptap/extension-link": "^2.1.13",
    "@tiptap/extension-placeholder": "^2.1.13",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## 📁 СТРУКТУРА ПРОЕКТА

```
icoffio-clone-nextjs/
│
├── app/                              # Next.js App Router
│   ├── [locale]/                     # Multi-language routing
│   │   ├── (site)/                   # Public site pages
│   │   │   ├── page.tsx             # Homepage
│   │   │   ├── article/[slug]/      # Article pages
│   │   │   ├── category/[slug]/     # Category pages
│   │   │   └── articles/            # Articles list
│   │   └── admin/                    # Admin panel
│   │       └── page.tsx             # Admin dashboard
│   │
│   ├── api/                          # API Routes
│   │   ├── admin/
│   │   │   ├── publish-article/     # ✅ v7.14.0: Supabase publish
│   │   │   └── generate-article/    # AI generation
│   │   ├── supabase-articles/       # ✅ v7.14.0: Supabase read
│   │   ├── telegram/
│   │   │   └── webhook/             # Telegram bot handler
│   │   └── revalidate/              # ISR revalidation
│   │
│   └── globals.css                   # Global styles
│
├── components/                       # React компоненты
│   ├── admin/                        # Admin panel components
│   │   ├── Dashboard.tsx
│   │   ├── ArticlesManager.tsx
│   │   ├── ArticleEditor.tsx
│   │   └── PublishingQueue.tsx
│   ├── ArticleCard.tsx
│   ├── CategoryCard.tsx
│   ├── LanguageSelector.tsx
│   └── SearchModalWrapper.tsx
│
├── lib/                              # Utility библиотеки
│   ├── data.ts                       # ✅ v7.14.0: Data fetching (Supabase)
│   ├── dual-language-publisher.ts   # Dual-lang publishing
│   ├── ai-copywriting-service.ts    # AI content generation
│   ├── telegram-bot-service.ts      # Telegram integration
│   ├── queue-service.ts             # Job queue management
│   ├── supabase-analytics.ts        # Analytics tracking
│   └── types.ts                      # TypeScript types
│
├── supabase/                         # Database
│   ├── migrations/
│   │   ├── 00_BASE_SCHEMA.sql       # ✅ Base table creation
│   │   ├── 20251102_articles_*.sql  # ✅ v7.14.0 migration
│   │   └── ...
│   └── schema.sql                    # Full schema
│
├── public/                           # Static files
│   ├── images/
│   └── fonts/
│
├── docs/                             # Документация
│   ├── DEPLOYMENT_GUIDE.md
│   ├── API_DOCUMENTATION.md
│   └── DEVELOPMENT_RULES.md
│
├── scripts/                          # Automation scripts
│   ├── new-feature.sh
│   ├── pre-deploy.sh
│   └── create-backup.sh
│
├── .env.local                        # Environment variables
├── next.config.mjs                   # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
│
├── CHANGELOG.md                      # ✅ История версий
├── PROJECT_MASTER_DOCUMENTATION.md  # ✅ Этот файл
└── package.json                      # Dependencies & scripts
```

---

## 🧩 ОСНОВНЫЕ КОМПОНЕНТЫ

### 1. Telegram Bot (Entry Point)

**Файл:** `app/api/telegram/webhook/route.ts`

**Назначение:**
- Прием сообщений от Telegram
- Обработка команд (`/start`, `/queue`, `/style`, etc.)
- Добавление задач в очередь

**Ключевые команды:**
- `/start` - приветствие
- `/queue` - статус очереди
- `/style` - выбор стиля публикации (news/analytical/tutorial/opinion)
- `/help` - справка

**Flow:**
```
User message → Telegram API → Webhook → Queue Service → Publisher → Supabase
```

---

### 2. Queue Service (Job Management)

**Файл:** `lib/queue-service.ts`

**Назначение:**
- Управление очередью задач
- Retry механизм (3 попытки)
- Timeout protection (180 секунд)
- Хранение в Supabase `telegram_jobs`

**Статусы задач:**
- `pending` - в очереди
- `processing` - обрабатывается
- `completed` - завершено
- `failed` - ошибка

---

### 3. Dual-Language Publisher (Core Logic)

**Файл:** `lib/dual-language-publisher.ts`

**Назначение:**
- Генерация контента на EN
- Перевод на PL
- Вставка изображений (2 шт)
- Публикация обеих версий

**Flow:**
```
1. AI генерация EN контента
2. Вставка изображений (AI prompts / Unsplash)
3. Перевод на PL
4. Публикация EN в Supabase (slug-en)
5. Публикация PL в Supabase (slug-pl)
6. Отправка уведомления в Telegram
```

---

### 4. Publish Article API (v7.14.0)

**Файл:** `app/api/admin/publish-article/route.ts`

**Назначение:**
- Публикация статей в Supabase
- Генерация slug
- Индексация контента

**Эндпоинт:**
```
POST /api/admin/publish-article
```

**Payload:**
```json
{
  "title": "Article Title",
  "content": "Markdown content...",
  "excerpt": "Short description",
  "category": "ai",
  "language": "en",
  "author": "Telegram Bot",
  "chatId": 123456,
  "wordCount": 500,
  "image": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "postId": 42,
  "url": "https://app.icoffio.com/en/article/slug-en",
  "slug": "slug-en",
  "publishedAt": "2025-11-02T10:00:00Z"
}
```

---

### 5. Supabase Articles API (v7.14.0)

**Файл:** `app/api/supabase-articles/route.ts`

**Назначение:**
- Чтение статей из Supabase
- Фильтрация по языку/категории
- Получение связанных статей

**Эндпоинты:**

**GET** - Список статей:
```
GET /api/supabase-articles?lang=en&limit=10&category=ai
```

**POST** - Конкретная статья:
```json
{
  "action": "get-by-slug",
  "slug": "article-slug-en",
  "language": "en"
}
```

**POST** - Связанные статьи:
```json
{
  "action": "get-related",
  "category": "ai",
  "excludeSlug": "current-article-en",
  "language": "en",
  "limit": 4
}
```

---

### 6. Admin Panel

**Файл:** `app/[locale]/admin/page.tsx`

**Компоненты:**
- **Dashboard** - статистика
- **Articles Manager** - управление статьями
- **Article Editor** - редактирование
- **Publishing Queue** - очередь публикации
- **Image System** - управление изображениями

**Доступ:**
```
https://app.icoffio.com/en/admin
```

**Аутентификация:** Password-based (localStorage)

---

## 🔌 API ENDPOINTS

### Public APIs:

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/supabase-articles` | GET | Получить статьи (фильтры: lang, category, limit) |
| `/api/supabase-articles` | POST | Получить статью по slug или related |
| `/api/admin/publish-article` | GET | Health check |

### Protected APIs (Admin):

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/admin/publish-article` | POST | Опубликовать статью в Supabase |
| `/api/admin/generate-article-content` | POST | AI генерация контента |
| `/api/admin/generate-image` | POST | Генерация изображения |
| `/api/telegram/webhook` | POST | Telegram bot webhook |
| `/api/telegram/force-process` | POST | Принудительный запуск очереди |

---

## 🗄️ БАЗА ДАННЫХ (SUPABASE)

### Таблица: `published_articles` (v7.14.0)

**Главная таблица для хранения статей**

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | SERIAL PRIMARY KEY | Auto-increment ID |
| `chat_id` | BIGINT | Telegram chat ID пользователя |
| `job_id` | VARCHAR(255) | ID задачи из очереди |
| `title` | VARCHAR(500) | Заголовок статьи |
| `slug_en` | TEXT | Slug английской версии (-en) |
| `slug_pl` | TEXT | Slug польской версии (-pl) |
| `content_en` | TEXT | Полный контент (EN) |
| `content_pl` | TEXT | Полный контент (PL) |
| `excerpt_en` | TEXT | Краткое описание (EN) |
| `excerpt_pl` | TEXT | Краткое описание (PL) |
| `image_url` | TEXT | URL главного изображения |
| `category` | VARCHAR(100) | Категория (ai, tech, apple, etc.) |
| `author` | TEXT | Автор (по умолчанию: 'icoffio Bot') |
| `tags` | TEXT[] | Массив тегов |
| `word_count` | INTEGER | Количество слов |
| `languages` | TEXT[] | Языки статьи ['en', 'pl'] |
| `processing_time` | INTEGER | Время генерации (секунды) |
| `source` | VARCHAR(50) | Источник (telegram-bot, api, admin) |
| `original_input` | TEXT | Оригинальный текст от пользователя |
| `meta_description` | TEXT | SEO meta description |
| `published` | BOOLEAN | Опубликована ли (видна на сайте) |
| `featured` | BOOLEAN | Избранная (для главной) |
| `url_en` | TEXT | URL английской версии |
| `url_pl` | TEXT | URL польской версии |
| `post_id_en` | INTEGER | Legacy WordPress ID (EN) |
| `post_id_pl` | INTEGER | Legacy WordPress ID (PL) |
| `created_at` | TIMESTAMP | Дата создания |

**Индексы:**
- `idx_articles_slug_en` - быстрый поиск по slug (EN)
- `idx_articles_slug_pl` - быстрый поиск по slug (PL)
- `idx_articles_published` - фильтр опубликованных
- `idx_articles_category_published` - категория + статус
- `idx_articles_title_search` - full-text search по заголовку
- `idx_articles_content_search` - full-text search по контенту

---

### Таблица: `telegram_jobs` (Queue)

**Очередь задач для обработки**

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | VARCHAR(255) PRIMARY KEY | Уникальный ID задачи |
| `type` | VARCHAR(50) | Тип (text-generate, url-parse) |
| `status` | VARCHAR(20) | pending/processing/completed/failed |
| `data` | JSONB | Данные задачи (text, chatId, etc.) |
| `result` | JSONB | Результат обработки |
| `error` | TEXT | Ошибка (если failed) |
| `retries` | INTEGER | Количество попыток |
| `max_retries` | INTEGER | Максимум попыток (обычно 3) |
| `created_at` | TIMESTAMP | Дата создания |
| `started_at` | TIMESTAMP | Начало обработки |
| `completed_at` | TIMESTAMP | Завершение |
| `updated_at` | TIMESTAMP | Последнее обновление |

---

### Таблица: `telegram_user_preferences`

**Настройки пользователей бота**

| Колонка | Тип | Описание |
|---------|-----|----------|
| `chat_id` | BIGINT PRIMARY KEY | Telegram chat ID |
| `publication_style` | VARCHAR(50) | news/analytical/tutorial/opinion |
| `language` | VARCHAR(10) | ru/en/pl |
| `created_at` | TIMESTAMP | Дата регистрации |
| `updated_at` | TIMESTAMP | Последнее обновление |

---

### Таблица: `telegram_image_library`

**Библиотека переиспользуемых изображений**

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | UUID PRIMARY KEY | Уникальный ID |
| `url` | TEXT | URL изображения |
| `unsplash_id` | TEXT | ID из Unsplash |
| `category` | VARCHAR(50) | Категория (ai, tech, etc.) |
| `keywords` | TEXT[] | Ключевые слова |
| `used_count` | INTEGER | Сколько раз использовалось |
| `created_at` | TIMESTAMP | Дата добавления |

---

### Таблица: `article_views`

**Аналитика просмотров статей**

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | SERIAL PRIMARY KEY | ID просмотра |
| `article_slug` | TEXT | Slug статьи |
| `user_ip` | TEXT | IP пользователя (хешированный) |
| `user_agent` | TEXT | User agent |
| `viewed_at` | TIMESTAMP | Время просмотра |

---

## 🚀 DEPLOYMENT

### Архитектура Deploy:

```
┌─────────────────────────────────────────────────────────┐
│  Developer                                              │
│  ↓                                                      │
│  git commit → git push origin main                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  GitHub Repository                                      │
│  - Source code (WITHOUT secrets)                       │
│  - GitHub Actions triggers                             │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions (optional)                              │
│  - Run tests                                            │
│  - Notify Telegram                                      │
│  - Trigger custom workflows                             │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Vercel Auto-Deploy                                     │
│  1. Detects push to main                               │
│  2. Pulls code from GitHub                             │
│  3. Injects environment variables (from Vercel)        │
│  4. Builds: npm install → npm run build                │
│  5. Deploys to edge network                            │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Production                                             │
│  https://app.icoffio.com                               │
│  - Next.js app with all secrets from Vercel env       │
└─────────────────────────────────────────────────────────┘
```

### 🔐 КРИТИЧЕСКИ ВАЖНО - ПРАВИЛА БЕЗОПАСНОСТИ:

#### ✅ ЧТО ЗАГРУЖАЕМ В GITHUB:
- ✅ Исходный код (`.ts`, `.tsx`, `.js`)
- ✅ Конфигурацию (без секретов)
- ✅ Документацию
- ✅ `.env.example` (шаблоны без реальных токенов)
- ✅ `.gitignore` (защищает sensitive files)

#### ❌ ЧТО НИКОГДА НЕ ЗАГРУЖАЕМ В GITHUB:
- ❌ `.env.local` (токены)
- ❌ `telegram-config.json` (токены)
- ❌ API keys, tokens, passwords
- ❌ Private keys
- ❌ Service role keys
- ❌ Hardcoded credentials в коде

#### 🔑 ГДЕ ХРАНЯТСЯ СЕКРЕТЫ:

**ТОЛЬКО в Vercel Environment Variables:**
```
GitHub (code) → Vercel (code + env vars) → Production (running app)
```

**Vercel Dashboard:**
```
https://vercel.com/andreys-projects-a55f75b3/icoffio-front/settings/environment-variables
```

**Установлены для всех окружений:**
- ✅ Production
- ✅ Preview
- ✅ Development

**Все секреты инжектятся в runtime, НЕ в build time!**

---

### Платформы:

**Frontend & API:** Vercel  
**Database:** Supabase  
**Domain:** Cloudflare DNS  

### Vercel Configuration:

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
.next
```

**Install Command:**
```bash
npm install
```

**Framework Preset:** Next.js

### Deploy Flow (детально):

```
1. Developer: git push origin main
   ↓
2. GitHub receives push
   ↓
3. Vercel webhook triggered (auto-deploy enabled)
   ↓
4. Vercel clones repo from GitHub
   ↓
5. Vercel injects environment variables
   ↓
6. Vercel runs: npm install
   ↓
7. Vercel runs: npm run build
   ↓
8. Build artifacts uploaded to edge network
   ↓
9. Deploy to production (app.icoffio.com)
   ↓
10. ISR pages regenerate on-demand
```

### Environments:

- **Production:** `app.icoffio.com` (main branch)
- **Preview:** Auto для каждого PR
- **Development:** `localhost:3000`

### Security Best Practices:

1. **Secrets только в Vercel** - НИКОГДА в Git
2. **`.gitignore` защищает** - проверяйте перед commit
3. **Code review** - проверяйте что нет токенов в PR
4. **Environment variables** - для всех окружений
5. **Rotate tokens** - если случайно закоммитили

---

## 🌐 CONFIGURED SERVICES & DOMAINS

### Production URLs:

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://app.icoffio.com | ✅ Active |
| **Legacy WordPress** | https://icoffio.com | ⚠️ Deprecated (читается для старых статей) |
| **API Base** | https://app.icoffio.com/api | ✅ Active |
| **Admin Panel** | https://app.icoffio.com/en/admin | ✅ Active |

### DNS Configuration:

**Managed by:** Cloudflare DNS

| Domain | Type | Points To |
|--------|------|-----------|
| `app.icoffio.com` | CNAME | `cname.vercel-dns.com` |
| `icoffio.com` | A | WordPress hosting |
| `www.icoffio.com` | CNAME | `icoffio.com` |

---

## 🔌 CONNECTED SERVICES

### 1. Supabase (PostgreSQL Database)

**Dashboard:** https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz

**Project Details:**
- Project ID: `dlellopouivlmbrmjhoz`
- Region: `us-east-1`
- Plan: Free → Pro (рекомендуется при > 10,000 статей)
- Database: PostgreSQL 15

**Активные таблицы:**
- `published_articles` - основное хранилище статей (v7.14.0)
- `telegram_jobs` - очередь задач
- `telegram_user_preferences` - настройки пользователей бота
- `telegram_image_library` - библиотека изображений
- `article_views` - аналитика просмотров

**Supabase URLs:**
```
API URL: https://dlellopouivlmbrmjhoz.supabase.co
DB URL: postgresql://postgres:[PASSWORD]@db.dlellopouivlmbrmjhoz.supabase.co:5432/postgres
```

---

### 2. Vercel (Hosting & Deployment)

**Dashboard:** https://vercel.com/andreys-projects-a55f75b3/icoffio-front

**Project Details:**
- Team: andreys-projects-a55f75b3
- Plan: Pro ($20/month) ✅ **UPGRADED**
- Region: Washington, D.C. (iad1)
- Framework: Next.js 14

**Deployment:**
- Production: `app.icoffio.com` (main branch)
- Auto-deploy: ✅ Enabled
- Build Command: `npm run build`
- Function Timeout: 60s (Pro plan)

**Environment Variables в Vercel:** ✅ Настроены для всех окружений (Production, Preview, Development)

---

### 3. OpenAI (AI Content Generation)

**Dashboard:** https://platform.openai.com/

**Используемые модели:**
- `gpt-4-turbo-preview` - генерация статей
- `gpt-4` - улучшение контента
- `gpt-3.5-turbo` - переводы (экономичный)

**API Endpoints используемые:**
- `POST https://api.openai.com/v1/chat/completions`
- `POST https://api.openai.com/v1/embeddings` (если нужен search)

**Лимиты:**
- Tier 1: $100/month
- RPM: 500 requests/minute
- TPM: 30,000 tokens/minute

---

### 4. Unsplash (Images API)

**Dashboard:** https://unsplash.com/oauth/applications

**Application Details:**
- App Name: icoffio
- Access Level: Production (не Demo)
- Rate Limit: 5,000 requests/hour

**API Endpoints:**
- `GET /search/photos` - поиск изображений
- `GET /photos/random` - случайное изображение

---

### 5. Telegram Bot API

**Bot Management:** https://t.me/BotFather

**Bot Details:**
- Bot Name: icoffio Bot
- Username: @icoffio_bot (пример, уточните актуальный)
- Webhook URL: `https://app.icoffio.com/api/telegram/webhook`

**Webhook Setup:**
```bash
# Установка webhook (уже настроено)
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.icoffio.com/api/telegram/webhook",
    "secret_token": "<TELEGRAM_SECRET_TOKEN>"
  }'
```

**Доступные команды:**
- `/start` - приветствие
- `/help` - справка
- `/queue` - статус очереди
- `/clear_queue` - очистить ошибки
- `/style` - выбор стиля публикации
- `/image_mode` - режим изображений

---

### 6. GitHub (Code Repository)

**Repository:** https://github.com/Warlockus-prod/icoffio-front

**Settings:**
- Main branch: `main` (protected)
- Auto-merge: Disabled (ручной review)
- Branch protection: Enabled

**GitHub Secrets (для Actions):**
- `TELEGRAM_BOT_TOKEN` - для deploy notifications
- `TELEGRAM_CHAT_ID` - куда слать уведомления

---

## 🔐 ENVIRONMENT VARIABLES

**⚠️ ВАЖНО:** Все переменные должны быть настроены в Vercel для всех окружений:
- ✅ Production
- ✅ Preview  
- ✅ Development

### Supabase (Database):

```bash
# Public (доступен на клиенте)
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>

# Server-only (только для API routes)
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>

# Альтернативные имена (для совместимости)
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_KEY=<your_supabase_service_role_key>
```

### OpenAI (AI Generation):

```bash
OPENAI_API_KEY=sk-proj-...
# Получить: https://platform.openai.com/api-keys
```

### Unsplash (Images):

```bash
UNSPLASH_ACCESS_KEY=...
# Получить: https://unsplash.com/oauth/applications
```

### Telegram Bot:

```bash
TELEGRAM_BOT_TOKEN=...
# Получить: @BotFather в Telegram

TELEGRAM_SECRET_TOKEN=...
# Любая случайная строка для webhook security
```

### Next.js (Revalidation):

```bash
REVALIDATE_SECRET=secret
# Любая строка для защиты /api/revalidate endpoint
```

### Legacy WordPress (Optional - для чтения старых статей):

```bash
WORDPRESS_API_URL=https://icoffio.com
# Используется только для чтения старых статей через GraphQL
# В v7.14.0 НЕ используется для публикации!
```

---

## 📝 ПРАВИЛА РАЗРАБОТКИ

### 1. Git Workflow

**Branching Strategy:**
```
main (production)
  ↑
feature/название-фичи
fix/описание-бага
docs/что-документируем
```

**Commit Format:**
```
✨ Add: новая функция
🐛 Fix: исправление бага
📝 Docs: документация
🔖 Release: версия
🚀 Deploy: deployment
🔧 Config: конфигурация
♻️ Refactor: рефакторинг
⚡ Perf: производительность
```

**Пример:**
```bash
git commit -m "✨ Add: Dual-language publishing support"
```

### 2. Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0) - Breaking changes
- **MINOR** (x.X.0) - Новые функции (обратно совместимые)
- **PATCH** (x.x.X) - Багфиксы

**Текущая версия:** `v7.14.0`

### 3. Testing Before Deploy

**Checklist:**
- [ ] `npm run build` - успешно
- [ ] `npx tsc --noEmit` - 0 errors
- [ ] Visual проверка в браузере
- [ ] Telegram bot тестирование
- [ ] Проверка Supabase queries

### 4. Documentation Updates

**При каждом изменении:**
1. Обновить `CHANGELOG.md`
2. Обновить `PROJECT_MASTER_DOCUMENTATION.md` (этот файл)
3. Создать migration notes если нужно
4. Обновить API документацию если API изменилось

---

## 📚 ДОКУМЕНТАЦИЯ

### Основные документы:

| Файл | Назначение | Обновляется |
|------|------------|-------------|
| **PROJECT_MASTER_DOCUMENTATION.md** | 🎯 Главная документация проекта | При каждом релизе |
| **CHANGELOG.md** | История всех изменений | При каждом коммите |
| **README.md** | Быстрый старт для разработчиков | При изменении setup |
| **DEVELOPMENT_RULES.md** | Правила разработки | При изменении процессов |
| **ARCHITECTURE_ANALYSIS.md** | Анализ архитектуры | При major changes |

### Специализированные документы:

| Файл | Назначение |
|------|------------|
| **V7.14.0_DEPLOYMENT_INSTRUCTIONS.md** | Инструкции для v7.14.0 |
| **QUICK_START_v7.14.0.md** | Быстрый старт v7.14.0 |
| **UNRELEASED_FEATURES.md** | Фичи которые не реализованы |
| **VERSION_HISTORY.md** | Детальная история версий |
| **ROLLBACK_v7.13.0.md** | Инструкции отката (если нужно) |

### API Documentation:

- Swagger/OpenAPI спецификация (планируется)
- Примеры запросов в Postman коллекции (планируется)

---

## 📖 ИСТОРИЯ ВЕРСИЙ

### v7.14.0 (2025-11-02) - 🚀 SUPABASE DIRECT PUBLISHING

**MAJOR CHANGE:** Убран WordPress, публикация напрямую в Supabase

**Почему:**
- WordPress timeout (60+ секунд)
- Статьи не публиковались
- Уведомления не приходили

**Решение:**
- Прямая публикация в Supabase (< 5 секунд)
- 12x улучшение производительности
- 100% надежность

**Изменения:**
- Расширена таблица `published_articles`
- Новый API `/api/supabase-articles`
- Обновлен `/api/admin/publish-article`
- Обновлен `lib/data.ts`

**Files:**
- `supabase/migrations/20251102_articles_content_storage.sql`
- `app/api/supabase-articles/route.ts`
- `app/api/admin/publish-article/route.ts`

---

### v7.13.0 (2025-10-31) - TELEGRAM BOT IMPROVEMENTS

**MINOR RELEASE:** Publication styles, Image library, Analytics fix

**Added:**
- Publication Style System (`/style` command)
- Image Library (reuse images)
- Analytics fix (materialized view)

**Files:**
- `lib/telegram-user-preferences.ts`
- `lib/telegram-image-service.ts`
- `supabase/migrations/20251031_*`

---

### v7.12.2 - Dual Language URLs in Notifications

**Added:** EN + PL URLs в Telegram уведомлениях

---

### v7.12.0 - Timeout Protection

**Added:** 180-second timeout для job processing

---

### v7.11.0 - Complete Telegram Bot Rewrite

**Changed:** Полная переработка Telegram бота

---

### v4.9.0 - Admin UX Phase 3 (Final Polish)

**Added:**
- Loading states & skeleton loaders
- Extended articles table (9 columns)
- Unified action footer

---

### v4.8.0 - Admin UX Phase 2 (WYSIWYG)

**Added:**
- Toast notifications
- TipTap WYSIWYG editor
- Preview system
- Undo/Redo

---

### v4.7.2 - Admin UX Phase 1

**Added:**
- Tooltips
- Excerpt control
- Grammarly disable

---

### Полная история:

См. `CHANGELOG.md` для детальной истории всех версий.

---

## 🔍 КАК ПОНЯТЬ ПРОЕКТ

### Для нового разработчика:

**Шаг 1:** Прочитайте этот файл (`PROJECT_MASTER_DOCUMENTATION.md`)

**Шаг 2:** Изучите основные файлы:
1. `lib/dual-language-publisher.ts` - core business logic
2. `app/api/telegram/webhook/route.ts` - entry point
3. `lib/queue-service.ts` - job management
4. `app/api/admin/publish-article/route.ts` - publishing API

**Шаг 3:** Запустите локально:
```bash
npm install
npm run dev
```

**Шаг 4:** Протестируйте через Telegram бота

**Шаг 5:** Изучите админ-панель:
```
http://localhost:3000/en/admin
```

### Для понимания архитектуры:

1. **Data Flow:** User → Telegram → Queue → Publisher → Supabase → Frontend
2. **Storage:** Supabase PostgreSQL (не WordPress!)
3. **Rendering:** SSR + ISR для SEO
4. **API:** RESTful через Next.js API routes

### Для добавления новой фичи:

1. Создать feature branch
2. Обновить необходимые компоненты
3. Обновить документацию
4. Протестировать
5. Обновить CHANGELOG.md
6. Merge в main
7. Deploy через Vercel (автоматически)

---

## 🎯 КЛЮЧЕВЫЕ ПРИНЦИПЫ ПРОЕКТА

### 1. **Documentation-First**
Всегда обновляйте документацию при изменениях.

### 2. **Type Safety**
Используйте TypeScript везде, избегайте `any`.

### 3. **Serverless-Friendly**
Код должен работать в serverless окружении (без state).

### 4. **API-First**
Все операции через API endpoints, не напрямую.

### 5. **Performance**
ISR кеширование, оптимизированные запросы, индексы в БД.

### 6. **Multi-language**
Всегда поддерживать EN + PL (минимум).

### 7. **Error Handling**
Graceful degradation, fallback mechanisms.

### 8. **Analytics**
Трекать все важные действия в Supabase.

---

## 📞 КОНТАКТЫ И РЕСУРСЫ

**GitHub:** https://github.com/Warlockus-prod/icoffio-front  
**Production:** https://app.icoffio.com  
**Admin Panel:** https://app.icoffio.com/en/admin  
**Supabase Dashboard:** https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz  
**Vercel Dashboard:** https://vercel.com/dashboard  

---

## 🏆 PRODUCTION READY

**Status:** ✅ **ГОТОВО К ПРОДАКШН**

**Версия:** v7.14.0  
**Last Updated:** 2025-11-02  
**Next Update:** При следующем релизе  

---

**🎉 ПРОЕКТ ПОЛНОСТЬЮ ДОКУМЕНТИРОВАН!**

При любых изменениях - обновляйте этот файл!

