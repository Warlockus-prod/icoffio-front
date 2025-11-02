# ❌ НЕРЕАЛИЗОВАННЫЕ ФИЧИ (Откат на v7.13.0)

## 🎯 ВЕРСИИ v7.14.0 - v7.16.1 (Откат из-за проблем с WordPress API)

---

## 📸 IMAGE MODE SYSTEM (v7.14.0)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **Команда `/image_mode`** в Telegram
- **4 режима генерации изображений:**
  - `smart` - AI prompts для обоих изображений (было по умолчанию)
  - `mixed` - 1-е изображение AI, 2-е Unsplash (экономия + разнообразие) ⭐
  - `simple` - Оба из Unsplash (без AI)
  - `dalle` - Оба через DALL-E
- **Supabase storage:** Колонка `image_mode` в `telegram_user_preferences`
- **Migration:** `20251031_image_mode_preferences.sql`

### Зачем было нужно:
- ✅ Решало проблему **одинаковых изображений** в статьях
- ✅ Экономия AI credits (mixed mode)
- ✅ Больше разнообразия визуального контента
- ✅ Гибкость для пользователя

### Файлы:
- `lib/telegram-user-preferences.ts` (ImageMode type, setImageMode, getImageMode)
- `lib/dual-language-publisher.ts` (image mode logic в insertImagesIntoContent)
- `app/api/telegram/webhook/route.ts` (handleImageMode)
- `lib/telegram-i18n.ts` (переводы для image mode)
- `supabase/migrations/20251031_image_mode_preferences.sql`

---

## 🔗 LANGUAGE SWITCHER FIX (v7.14.7, v7.16.0)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **Исправление переключателя языков** (EN ↔ PL)
- **WordPress meta fields:**
  - `related_post_id` - ID связанной статьи
  - `related_post_slug` - Slug связанной статьи
- **Bidirectional linking:**
  - После публикации PL статьи → PATCH запрос обновляет EN статью
  - Language switcher правильно работает в обе стороны
- **Slug mapping:**
  - EN: `/article/google-tools`
  - PL: `/article/google-tools-pl`
  - Switcher автоматически добавляет/убирает `-pl`

### Зачем было нужно:
- ✅ Решало проблему **404 при переключении языка**
- ✅ EN и PL статьи были бы правильно связаны
- ✅ Улучшение UX для пользователей

### Файлы:
- `app/api/admin/publish-article/route.ts` (PATCH method)
- `lib/dual-language-publisher.ts` (PATCH запрос после PL публикации)
- `components/LanguageSelector.tsx` (slug mapping логика)

### Почему не работало:
- ⚠️ **WordPress API timeout** - PATCH запрос увеличивал время публикации
- ⚠️ WordPress становился **неотзывчивым** (ETIMEDOUT после 60+ секунд)

---

## 🔄 ADVANCED QUEUE PROCESSING (v7.14.9 - v7.15.2)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **Serverless-safe queue processing:**
  - Database-backed `isProcessing` state (вместо in-memory)
  - HTTP chain processing через `/api/telegram/force-process`
  - Каждый job вызывает следующий через HTTP request
  - Гарантия обработки в serverless окружении
- **Force Process Endpoint:**
  - `POST /api/telegram/force-process`
  - Принудительный запуск очереди
  - `forceResetProcessing()` для сброса флага

### Зачем было нужно:
- ✅ Решало проблему **застревающих tasks** в serverless
- ✅ `setTimeout` не работает в Vercel (ephemeral state)
- ✅ Более надежная обработка очереди

### Файлы:
- `lib/queue-service.ts` (DB check for isProcessing, HTTP chain)
- `app/api/telegram/force-process/route.ts` (новый endpoint)
- `app/api/telegram/webhook/route.ts` (HTTP call после cleanup)

### Почему не работало:
- ⚠️ Проблема была **не в очереди**, а в **WordPress API**
- ⚠️ Даже с идеальной очередью → timeout от WordPress
- ⚠️ Сложность добавляла overhead без решения root cause

---

## 🎨 FRONTEND CRASH FIXES (v7.14.11 - v7.14.13)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **SSR Safety для scroll компонентов:**
  - `ReadingProgress.tsx` - защита от undefined window
  - `BackToTop.tsx` - защита от undefined window
  - `typeof window === 'undefined'` checks
  - Throttling с requestAnimationFrame
- **Защита от undefined:**
  - `RelatedArticles.tsx` - filter перед map
  - `AdvancedSearch.tsx` - проверка post.category
  - `app/[locale]/(site)/page.tsx` - filter для posts
  - `app/[locale]/(site)/category/[slug]/page.tsx` - filter для posts

### Зачем было нужно:
- ✅ Решало **crash при scroll** на сайте
- ✅ React hydration errors
- ✅ `TypeError: Cannot read properties of undefined`

### Файлы:
- `components/ReadingProgress.tsx`
- `components/BackToTop.tsx`
- `components/RelatedArticles.tsx`
- `components/AdvancedSearch.tsx`
- `app/[locale]/(site)/page.tsx`
- `app/[locale]/(site)/category/[slug]/page.tsx`

### Почему не работало:
- ⚠️ Возможно **еще не протестировано** достаточно
- ⚠️ Или проблема была в другом месте

---

## 📢 GITHUB ACTIONS NOTIFICATIONS (v7.14.5+)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **Автоматические уведомления в Telegram:**
  - После каждого deploy
  - Информация о коммите, авторе, версии
  - GitHub Actions workflow
- **Workflow файл:**
  - `.github/workflows/deploy-notification.yml`
  - Trigger на push to main
  - appleboy/telegram-action

### Зачем было нужно:
- ✅ Решало проблему **отсутствия уведомлений о deploy**
- ✅ Автоматический мониторинг релизов

### Файлы:
- `.github/workflows/deploy-notification.yml`
- `.github/SETUP_NOTIFICATIONS.md`

### Почему не работало:
- ⚠️ **Эмодзи в commit messages** ломали workflow
- ⚠️ Нужен EOF delimiter для multiline output
- ⚠️ Возможно не настроены GitHub Secrets

---

## 🎯 AGGRESSIVE CLEANUP (v7.14.2, v7.14.8)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **Сокращение timeout для stuck jobs:** 3 min → 2 min
- **Улучшенная `/clear_queue` команда:**
  - Более агрессивная очистка failed tasks
  - Автоматический cleanup при `/queue`
- **Featured image timeout protection:**
  - 30 сек timeout для генерации featured image
  - Fallback без изображения если timeout

### Зачем было нужно:
- ✅ Быстрее восстановление после stuck jobs
- ✅ Меньше manual intervention

### Файлы:
- `lib/queue-service.ts` (cleanupStuckJobs timeout 2 min)
- `app/api/telegram/webhook/route.ts` (handleClearQueue)
- `lib/dual-language-publisher.ts` (featured image timeout)

---

## 🚀 CACHE BUSTING (v7.15.3)

### Статус: ❌ НЕ РЕАЛИЗОВАНО (откат)

### Что планировалось:
- **Force reload после deploy:**
  - `generateBuildId` с timestamp в next.config.mjs
  - Adjusted `onDemandEntries`
  - Гарантия что клиенты получают новый код

### Зачем было нужно:
- ✅ Решало **React hydration errors**
- ✅ Старый кэш клиента не конфликтует с новым сервером

### Файлы:
- `next.config.mjs`

---

## 📊 ИТОГОВАЯ СТАТИСТИКА

### ❌ Откачено функций: **9 мажорных фич**
### 📁 Откачено файлов: **~20+ файлов изменений**
### 🕐 Потерянное время: **~4-5 часов работы**

---

## 🎯 ОСНОВНАЯ ПРИЧИНА ОТКАТА

### ⚠️ **WORDPRESS API TIMEOUT**

Все фичи были корректно реализованы, но:
- WordPress API стал **экстремально медленным** (60+ сек для POST)
- Даже после upgrade на **Vercel Pro** (60 sec limit)
- ETIMEDOUT errors при публикации
- Проблема **не в коде**, а в **WordPress сервере**

### 🔍 Root Cause:
- Медленный хостинг WordPress
- Нет CDN/кэша
- Возможна высокая нагрузка сервера
- WordPress plugins замедляют API

---

## 💡 ЧТО МОЖНО РЕАЛИЗОВАТЬ ПОЗЖЕ

### ✅ Безопасно добавить (не влияют на WordPress):

1. **Image Mode System** ✅ 
   - Не влияет на публикацию
   - Только изменяет источник изображений
   
2. **Frontend Crash Fixes** ✅
   - SSR safety
   - Undefined protection
   - Scroll components
   
3. **GitHub Actions Notifications** ✅
   - Только уведомления
   - Не влияет на core функции

4. **Cache Busting** ✅
   - Next.js config
   - Клиентская оптимизация

### ⚠️ Требует решения WordPress проблемы:

5. **Language Switcher Fix** ⚠️
   - Требует PATCH запросы к WordPress
   - Увеличивает время публикации
   - Нужен быстрый WordPress API

6. **Advanced Queue Processing** ⚠️
   - Полезно, но не решает WordPress timeout
   - Можно добавить для улучшения reliability

---

## 🚀 NEXT STEPS (Если захотите вернуть фичи)

### Шаг 1: Исправить WordPress
- Оптимизировать сервер
- Добавить CDN
- Проверить plugins
- Протестировать скорость API

### Шаг 2: Вернуть безопасные фичи
- Image Mode System
- Frontend fixes
- GitHub notifications
- Cache busting

### Шаг 3: Вернуть WordPress-зависимые фичи
- Language Switcher
- Advanced Queue (опционально)

---

**v7.13.0 = STABLE BASE ДЛЯ НОВЫХ ФИЧ** ✅

