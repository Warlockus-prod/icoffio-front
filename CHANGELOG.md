# 📝 Changelog - icoffio Project

All notable changes to this project will be documented in this file.

## [8.7.10] - 2025-12-09 - 🔄 FULL ROLLBACK to v8.7.4 + Critical Fixes

**PREVIOUS VERSION:** v8.7.9  
**NEW VERSION:** v8.7.10  
**TYPE:** PATCH (full rollback + preserved fixes)

### 🔄 FULL ROLLBACK TO v8.7.4

**Проблема:** После изменений v8.7.6-v8.7.9 парсер полностью сломался  
**Решение:** Полный откат всех измененных файлов к последней работающей версии v8.7.4 (501bc0b)

**Откачены файлы:**
- ✅ `lib/url-parser-service.ts` → v8.7.4
- ✅ `lib/unified-article-service.ts` → v8.7.4
- ✅ `lib/translation-service.ts` → v8.7.4
- ✅ `lib/telegram-simple/translator.ts` → v8.7.4
- ✅ `lib/telegram-simple/content-processor.ts` → v8.7.4
- ✅ `lib/utils/content-cleaner.ts` → v8.7.4

### ✅ PRESERVED CRITICAL FIXES

**Сохранены важные исправления:**
- ✅ `title_en` и `title_pl` поля в publisher (польский заголовок работает)
- ✅ `title_pl` extraction priority в supabase-articles
- ✅ System Logs интеграция (логирование работает)
- ✅ Activity Log (работает)
- ✅ Telegram bot logging (работает)

### 📋 WHAT WORKS NOW

- ✅ URL Parser — восстановлен к v8.7.4
- ✅ Translation Service — восстановлен к v8.7.4
- ✅ Content Processing — восстановлен к v8.7.4
- ✅ Polish titles — работают через title_pl
- ✅ System Logs — работают (Supabase)
- ✅ Activity Log — работает (Supabase)
- ✅ Telegram Bot — работает с логированием

### 📋 WHAT WAS ROLLED BACK

Откачены все изменения v8.7.6-v8.7.9:
- ❌ Markdown removal from content (было нестабильно)
- ❌ Polish title 160 char limit (было нестабильно)
- ❌ Enhanced error messages (было нестабильно)

**Файлы:**
- `lib/url-parser-service.ts` - rollback to v8.7.4 + logging
- `lib/unified-article-service.ts` - rollback to v8.7.4
- `lib/translation-service.ts` - rollback to v8.7.4
- `lib/telegram-simple/translator.ts` - rollback to v8.7.4
- `lib/telegram-simple/content-processor.ts` - rollback to v8.7.4
- `lib/utils/content-cleaner.ts` - rollback to v8.7.4
- `lib/telegram-simple/publisher.ts` - kept title_pl fix
- `app/api/supabase-articles/route.ts` - kept title_pl extraction
- `package.json` - version updated to 8.7.10

**Result:**
- ✅ Парсер работает (v8.7.4 stable)
- ✅ Польские заголовки работают (title_pl)
- ✅ Логи работают (System Logs + Activity)
- ✅ Build успешен (0 errors)

---

## [8.7.9] - 2025-12-09 - 🔄 ROLLBACK: Fix URL Parser + Restore Logging

**PREVIOUS VERSION:** v8.7.8  
**NEW VERSION:** v8.7.9  
**TYPE:** PATCH (rollback to working version + logging fixes)

### 🐛 CRITICAL FIX: URL Parser Rollback

**Проблема:** После изменений в v8.7.6-v8.7.8 парсер URL перестал работать  
**Исправление:**
- ✅ Откатили `lib/url-parser-service.ts` к v8.7.4 (501bc0b)
- ✅ Откатили `lib/unified-article-service.ts` к v8.7.4 (501bc0b)
- ✅ Восстановлен рабочий timeout, maxContentLength, User-Agent
- ✅ Восстановлена рабочая логика extractMainImage

### 🔍 LOGGING INTEGRATION RESTORED

**Проблема:** После отката логирование было удалено  
**Исправление:**
- ✅ Добавлено обратно `systemLogger` в `url-parser-service.ts`
- ✅ Логирование всех операций парсинга (start, success, errors)
- ✅ Таймеры для измерения производительности

### 📊 SYSTEM LOGS TAB FIXED

**Проблема:** System Logs tab не работал (неправильный импорт)  
**Исправление:**
- ✅ Исправлен импорт в `app/[locale]/admin/page.tsx`
- ✅ `LogsViewer` содержит tabs: System Logs (Supabase) + Local Logs (Browser)

**Файлы:**
- `lib/url-parser-service.ts` - откат к v8.7.4 + logging
- `lib/unified-article-service.ts` - откат к v8.7.4
- `app/[locale]/admin/page.tsx` - fixed System Logs import
- `package.json` - версия обновлена до 8.7.9

**Result:**
- ✅ URL парсер работает снова
- ✅ Парсинг статей восстановлен
- ✅ System Logs работают (Supabase)
- ✅ Activity Log работает (Supabase)
- ✅ Local Logs работают (Browser localStorage)

---

