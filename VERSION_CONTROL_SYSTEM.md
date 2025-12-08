# 🔖 СИСТЕМА КОНТРОЛЯ ВЕРСИЙ - ICOFFIO

**Дата создания:** 8 декабря 2025  
**Статус:** 🔴 ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ

---

## 🚨 ПРАВИЛО #1: ВСЕГДА ПРОВЕРЯТЬ ПОСЛЕДНЮЮ ВЕРСИЮ!

### ПЕРЕД ЛЮБЫМ КОММИТОМ:

```bash
# 1. Проверить последний тег
git tag -l | sort -V | tail -1

# 2. Проверить package.json
cat package.json | grep '"version"'

# 3. Проверить последний коммит
git log --oneline -1

# 4. Проверить CHANGELOG.md
head -20 CHANGELOG.md
```

**ВСЁ ДОЛЖНО СОВПАДАТЬ!**

---

## 📋 ТЕКУЩЕЕ СОСТОЯНИЕ (8 декабря 2025)

### ✅ ПОСЛЕДНЯЯ ВЕРСИЯ:
```
git tag: v8.7.3
package.json: 8.7.4 (обновлён)
Admin UI: 8.7.4 (обновлён)
```

### 📜 ИСТОРИЯ ВЕРСИЙ:

```
v8.7.3 - ✨ RADICAL Content Rewriting System (последний до сегодня)
v8.7.2 - 🔧 Language mixing fix
v8.7.1 - 🐛 HOTFIX Critical Telegram Bot Fixes
v8.7.0 - 🌐 Multilingual Telegram Bot Interface
v8.6.5 - 🔧 Fix article deletion
v8.6.4 - 🔧 Major Content & UX Fixes
v8.6.3 - 🔧 Fix ban API
v8.6.2 - 🐛 Major Admin Panel Fixes
v8.6.1 - 🐛 HOTFIX Critical Telegram Bot Fixes
v8.6.0 - ✨ System Logging Infrastructure
v8.5.2 - ✨ Admin Panel Improvements
v8.5.1 - ✨ Image Generation for Telegram Bot
v8.5.0 - ✨ Telegram Bot Settings Integration
```

---

## 🎯 СЕМАНТИЧЕСКОЕ ВЕРСИОНИРОВАНИЕ

### Формат: MAJOR.MINOR.PATCH

#### MAJOR (X.0.0) - Breaking Changes
**Когда:** Несовместимые изменения API, полная переделка

**Примеры:**
- v8.0.0 - Telegram Bot Simplified (полная переделка)
- v9.0.0 - (будущее) Новая архитектура

#### MINOR (X.Y.0) - New Features
**Когда:** Новая функциональность, обратно совместимая

**Примеры:**
- v8.5.0 - Telegram Bot Settings
- v8.6.0 - System Logging
- v8.7.0 - Multilingual Interface

#### PATCH (X.Y.Z) - Bug Fixes
**Когда:** Исправления ошибок, мелкие улучшения

**Примеры:**
- v8.6.1 - HOTFIX Critical fixes
- v8.6.3 - Fix ban API
- v8.7.1 - HOTFIX Telegram fixes

---

## ✅ ПРОЦЕДУРА СОЗДАНИЯ РЕЛИЗА

### ПЕРЕД КОММИТОМ:

```bash
# ШАГ 1: Проверить текущую версию
cd /Users/Andrey/App/icoffio-front/icoffio-clone-nextjs

echo "=== CURRENT VERSION CHECK ==="
echo "Git tags:"
git tag -l | sort -V | tail -5
echo ""
echo "package.json:"
grep '"version"' package.json
echo ""
echo "Last commit:"
git log --oneline -1
```

### ОПРЕДЕЛИТЬ НОВУЮ ВЕРСИЮ:

**Последняя:** v8.7.3  
**Новая зависит от типа изменений:**

- **PATCH (8.7.4)** - если bugfix, cleanup, small improvements
- **MINOR (8.8.0)** - если новая фича, новый функционал
- **MAJOR (9.0.0)** - если breaking changes, несовместимость

**Сегодняшние изменения (cleanup + security):**
- Удалён мёртвый код ✅
- Исправлена безопасность ✅
- Унифицированы стандарты ✅

**ТИП:** PATCH (никаких breaking changes)  
**ВЕРСИЯ:** **v8.7.4**

---

### ОБНОВИТЬ ВСЕ ФАЙЛЫ:

```bash
# 1. package.json
"version": "8.7.4"

# 2. app/[locale]/admin/page.tsx
<div>8.7.4</div>

# 3. CHANGELOG.md
## [8.7.4] - 2025-12-08 - 🧹 Code Cleanup & Security Fixes
```

### СОЗДАТЬ COMMIT:

```bash
git add .
git commit -m "🧹 v8.7.4: Code cleanup & security fixes

PREVIOUS: v8.7.3
NEW: v8.7.4

✅ Security: Removed hardcoded password
✅ Cleanup: Deleted ~1948 lines dead code
✅ Unification: Unified slug generator
✅ Languages: Removed unused (de,ro,cs,ru)
✅ Build: SUCCESS"

git push origin main
git tag v8.7.4
git push origin v8.7.4
```

---

## 📋 СИСТЕМА КОНТРОЛЯ ВЕРСИЙ

### СОЗДАЁМ СКРИПТ ПРОВЕРКИ:

**Файл:** `scripts/check-version.sh`

```bash
#!/bin/bash

echo "🔍 VERSION CHECK"
echo "==============="
echo ""

# Get last git tag
LAST_TAG=$(git tag -l | sort -V | tail -1)
echo "Last git tag: $LAST_TAG"

# Get package.json version
PKG_VERSION=$(cat package.json | grep '"version"' | cut -d'"' -f4)
echo "package.json: $PKG_VERSION"

# Get version from admin page
ADMIN_VERSION=$(grep -A 1 "Version</div>" app/[locale]/admin/page.tsx | tail -1 | grep -o '[0-9.]*')
echo "Admin UI: $ADMIN_VERSION"

# Get CHANGELOG first version
CHANGELOG_VERSION=$(grep -m 1 "\[.*\]" CHANGELOG.md | grep -o '[0-9.]*' | head -1)
echo "CHANGELOG: $CHANGELOG_VERSION"

echo ""

# Check if all match
if [ "$PKG_VERSION" == "$CHANGELOG_VERSION" ]; then
  echo "✅ package.json ↔ CHANGELOG.md: MATCH"
else
  echo "❌ package.json ↔ CHANGELOG.md: MISMATCH!"
  exit 1
fi

echo ""
echo "✅ VERSION CHECK PASSED"
echo "Next version should be > $LAST_TAG"
```

---

## 🎯 ПРАВИЛЬНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ

### ТЕКУЩЕЕ (исправленное):

```
v8.7.3 - Content Rewriting (последний)
v8.7.4 - Code Cleanup (сегодня) ← ПРАВИЛЬНО
```

---

## ИСПРАВЛЯЮ ПРЯМО СЕЙЧАС:

