# 📜 ИСТОРИЯ ВЕРСИЙ - Последние релизы

## 🚨 ТЕКУЩИЕ ВЕРСИИ (ПРОБЛЕМНЫЕ)

### v7.15.2 (cc9aaab) - 2025-11-01 ❌ НЕ РАБОТАЕТ
**Изменения:** Serverless State Fix - проверка статуса в БД
**Проблема:** WordPress timeout 249+ секунд
**Статус:** ЗАВИСАЕТ

### v7.15.1 (8ec5237) ❌ НЕ РАБОТАЕТ
**Изменения:** HTTP Chain Processing для queue
**Проблема:** WordPress timeout
**Статус:** ЗАВИСАЕТ

### v7.15.0 (7302e07) ❌ НЕ РАБОТАЕТ
**Изменения:** Force Process Queue Endpoint
**Проблема:** WordPress timeout
**Статус:** ЗАВИСАЕТ

---

## 📊 v7.14.x СЕРИЯ

### v7.14.13 (2ad0bfe)
**Изменения:** AdvancedSearch Undefined Category Fix
**Код:** Исправлен TypeError в AdvancedSearch.tsx
**Статус:** ❓ Не тестировалась публикация

### v7.14.12 (99a4e58)
**Изменения:** Rollback Queue Logic (простая логика)
**Код:** Откат на setTimeout вместо HTTP chain
**Статус:** ❓ Не тестировалась публикация

### v7.14.11 (09787ec)
**Изменения:** Undefined Slug Error Fix
**Код:** Исправлен TypeError в RelatedArticles.tsx
**Статус:** ❓ Не тестировалась публикация

### v7.14.10 (5cf2c92)
**Изменения:** FINAL API Spam Fix
**Код:** Убраны зависимости из useEffect в SearchModalWrapper
**Статус:** ❓ Не тестировалась публикация

### v7.14.9 (a5cfde4)
**Изменения:** Serverless Queue Fix
**Код:** Прямые рекурсивные вызовы вместо setTimeout
**Статус:** ❓ Не тестировалась публикация

### v7.14.8 (5d422c0)
**Изменения:** Queue Cleanup Command
**Код:** Добавлена команда /clear_queue
**Статус:** ❓ Не тестировалась публикация

### v7.14.7 (2dae914)
**Изменения:** Language Switcher Fix + Audit Report
**Код:** Исправлен language switcher для article pages
**Статус:** ❓ Не тестировалась публикация

### v7.14.6 (a817ba9) 🔍 SCROLL FIX
**Изменения:** Scroll Error Fix
**Код:** 
- ReadingProgress.tsx - SSR safety, try-catch
- BackToTop.tsx - SSR safety, try-catch
**Статус:** ❓ Не тестировалась публикация

### v7.14.5 (21fa2c8)
**Изменения:** Telegram Webhook Diagnostics
**Код:** Enhanced logging для webhook, GET endpoint
**Статус:** ❓ Не тестировалась публикация

### v7.14.4 (171ab9e)
**Изменения:** API Request Spam Fix
**Код:** Убраны dependencies из SearchModalWrapper useEffect
**Статус:** ❓ Не тестировалась публикация

### v7.14.3 (1969e84)
**Изменения:** Auto Start Queue Processing
**Код:** Автоматический запуск processQueue при /queue
**Статус:** ❓ Не тестировалась публикация

### v7.14.2 (e524f3e)
**Изменения:** Queue Stuck Jobs + Featured Image Timeout
**Код:** Cleanup timeout 3→2 мин, featured image timeout 30s
**Статус:** ❓ Не тестировалась публикация

### v7.14.1 (c3b4840)
**Изменения:** Error Handling + Featured Image Fix
**Код:** Try-catch для getImageMode, featured image order fix
**Статус:** ❓ Не тестировалась публикация

### v7.14.0 (839a0af) ✅ МОГЛА РАБОТАТЬ
**Изменения:** Image Mode System + Language Filtering Fix
**Код:**
- Добавлен /image_mode command (smart/mixed/simple/dalle)
- Исправлена фильтрация popular articles по языку
- Supabase migration для image_mode
**Статус:** ✅ Новая функциональность, должна работать

---

## 🎯 v7.13.0 (1634314) ✅ PRODUCTION READY

**Дата:** ~2025-10-30
**Статус:** ✅ STABLE - Полный функционал работает

**Изменения:**
- Publication Style System (/style command)
- Image Library System (reuse изображений)
- Analytics Fix (materialized view)
- Supabase migrations

**Файлы:**
- lib/telegram-user-preferences.ts - стили публикации
- lib/telegram-image-service.ts - библиотека изображений
- lib/supabase-analytics.ts - аналитика
- supabase/migrations/ - SQL миграции

**Тестирование:** Полностью протестирована
**Публикация:** ✅ РАБОТАЛА

---

## 📺 v7.9.0 (baf9b7c) - VIDEO PLAYERS SYSTEM 🎬

**Дата:** ~2025-10-25
**Статус:** ✅ STABLE

**Изменения:**
- Video Players System
- YouTube/Vimeo плееры
- Возможно рекламный код здесь? 🔍

**Что добавлено:**
- components/VideoPlayer.tsx (?)
- Интеграция плееров в статьи
- Реклама под плеером? ⚠️

---

## 📺 v7.7.0 (2b51e5d) - REAL-TIME ADVERTISING

**Дата:** ~2025-10-20
**Статус:** ✅ STABLE

**Изменения:**
- Real-time Advertising Management
- VOX реклама
- Advertising positions

---

## 📺 v7.6.0 (696e9b3) - ADVERTISING SYSTEM

**Дата:** ~2025-10-18
**Статус:** ✅ STABLE

**Изменения:**
- Базовая система рекламы
- VOX интеграция

---

## 🎯 РЕКОМЕНДАЦИИ ДЛЯ ОТКАТА

### Вариант 1: v7.13.0 ✅ РЕКОМЕНДУЮ
**Коммит:** 1634314
**Причина:** Последняя ПОЛНОСТЬЮ протестированная версия
**Статус:** PRODUCTION READY
**Функции:** Все работает, включая публикацию

### Вариант 2: v7.14.0 ✅ МОЖЕТ РАБОТАТЬ
**Коммит:** 839a0af
**Причина:** Добавлен image_mode, должна работать
**Статус:** Новая функциональность
**Риск:** Не полностью протестирована

### Вариант 3: v7.9.0 (если нужно БЕЗ ПЛЕЕРОВ)
**Коммит:** baf9b7c
**Причина:** ДО Video Players System
**Статус:** STABLE, но старая
**Минус:** Нет новых фич (style, image_mode)

---

## 🔍 КАКУЮ ВЫБРАТЬ?

### Если хотите СТАБИЛЬНОСТЬ:
→ v7.13.0 (1634314)

### Если хотите НОВЫЕ ФИЧИ:
→ v7.14.0 (839a0af)

### Если нужно БЕЗ Video Players:
→ v7.9.0 (baf9b7c)

