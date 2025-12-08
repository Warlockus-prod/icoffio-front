# 🗄️ SUPABASE MIGRATION - interface_language

**Версия:** v8.6.1  
**Дата:** 2025-12-08

---

## 📋 ЧТО ДЕЛАЕМ:

Добавляем колонку `interface_language` в таблицу `telegram_user_preferences` для поддержки мультиязычного интерфейса бота (RU/EN/PL).

---

## 🚀 ИНСТРУКЦИЯ (3 ШАГА):

### ШАГ 1: Откройте Supabase SQL Editor

1. Перейдите: **https://supabase.com/dashboard**
2. Выберите ваш проект: **icoffio** (или как он называется)
3. В левом меню нажмите: **SQL Editor** (иконка 📝)
4. Нажмите: **+ New Query**

---

### ШАГ 2: Вставьте SQL код

Скопируйте и вставьте этот SQL:

```sql
-- Add interface_language column
ALTER TABLE telegram_user_preferences
ADD COLUMN IF NOT EXISTS interface_language TEXT 
DEFAULT 'ru' 
CHECK (interface_language IN ('ru', 'en', 'pl'));

-- Add comment
COMMENT ON COLUMN telegram_user_preferences.interface_language 
IS 'Bot interface language: ru (Russian), en (English), pl (Polish)';

-- Update existing rows to have default language (ru)
UPDATE telegram_user_preferences
SET interface_language = 'ru'
WHERE interface_language IS NULL;
```

---

### ШАГ 3: Выполните запрос

1. Нажмите кнопку: **▶️ Run** (или Ctrl+Enter)
2. Должно появиться: **Success. No rows returned**
3. Готово! ✅

---

## ✅ ПРОВЕРКА:

Выполните проверочный запрос:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'telegram_user_preferences' 
AND column_name = 'interface_language';
```

**Ожидаемый результат:**
```
column_name         | data_type | column_default
--------------------|-----------|--------------
interface_language  | text      | 'ru'::text
```

---

## 🔍 ЧТО ИЗМЕНИТСЯ:

### До миграции:
```
telegram_user_preferences
├── chat_id (PK)
├── content_style
├── images_count
├── images_source
├── auto_publish
├── created_at
└── updated_at
```

### После миграции:
```
telegram_user_preferences
├── chat_id (PK)
├── content_style
├── images_count
├── images_source
├── auto_publish
├── interface_language  ← НОВОЕ! 🆕
├── created_at
└── updated_at
```

---

## 🎯 ВОЗМОЖНЫЕ ЗНАЧЕНИЯ:

- `'ru'` - 🇷🇺 Русский (по умолчанию)
- `'en'` - 🇬🇧 English
- `'pl'` - 🇵🇱 Polski

---

## ⚠️ ЕСЛИ ОШИБКА:

### Ошибка: "column already exists"
✅ **Это нормально!** Колонка уже существует, пропустите этот шаг.

### Ошибка: "table does not exist"
❌ **Проблема:** Таблица `telegram_user_preferences` не существует.

**Решение:** Сначала создайте таблицу:
```sql
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
  chat_id BIGINT PRIMARY KEY,
  content_style TEXT DEFAULT 'journalistic',
  images_count INTEGER DEFAULT 2,
  images_source TEXT DEFAULT 'unsplash',
  auto_publish BOOLEAN DEFAULT true,
  interface_language TEXT DEFAULT 'ru' CHECK (interface_language IN ('ru', 'en', 'pl')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 ПОСЛЕ МИГРАЦИИ:

1. Telegram Settings в админке смогут сохраняться ✅
2. Бот сможет переключаться на EN/PL/RU 🌐
3. Настройки языка будут храниться в БД 💾

---

**Готово? Переходите к тестированию!** 🚀

