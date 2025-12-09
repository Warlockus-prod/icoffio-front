# 📝 Changelog - icoffio Project

All notable changes to this project will be documented in this file.

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

