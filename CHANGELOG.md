# 📝 Changelog - icoffio Project

All notable changes to this project will be documented in this file.

## [8.7.9] - 2025-12-09 - 🔄 ROLLBACK: Fix URL Parser

**PREVIOUS VERSION:** v8.7.8  
**NEW VERSION:** v8.7.9  
**TYPE:** PATCH (rollback to working version)

### 🐛 CRITICAL FIX: URL Parser Rollback

**Проблема:** После изменений в v8.7.6 парсер URL перестал работать  
**Исправление:**
- ✅ Откатили `lib/url-parser-service.ts` к последней работающей версии v8.7.4
- ✅ Восстановлен рабочий timeout, maxContentLength, User-Agent
- ✅ Восстановлена рабочая логика extractMainImage

**Файлы:**
- `lib/url-parser-service.ts` - откат к v8.7.4 (501bc0b)
- `package.json` - версия обновлена до 8.7.9

**Result:**
- ✅ URL парсер работает снова
- ✅ Парсинг статей восстановлен

---

