# 🗄️ SUPABASE SETUP GUIDE

## Настройка Database для Telegram Bot Logging & Statistics

### 📋 Шаг 1: Создать Supabase проект

1. Зайди на https://supabase.com
2. Войди через GitHub
3. Нажми **"New Project"**
4. Заполни:
   - **Name:** `icoffio-telegram-bot`
   - **Database Password:** (создай надежный пароль, сохрани!)
   - **Region:** `Europe (West)` (ближайший к тебе)
   - **Pricing Plan:** `Free` (достаточно для начала)
5. Нажми **"Create new project"**
6. Жди 2-3 минуты пока создается

---

### 📋 Шаг 2: Запустить SQL Schema

1. В Supabase Dashboard открой **"SQL Editor"** (левое меню)
2. Нажми **"New Query"**
3. Скопируй весь контент из `/supabase/schema.sql`
4. Вставь в редактор
5. Нажми **"Run"** (или `Ctrl+Enter`)
6. Проверь что все 3 таблицы созданы:
   - `user_preferences`
   - `usage_logs`
   - `published_articles`

---

### 📋 Шаг 3: Получить API ключи

1. Открой **"Settings"** → **"API"** (левое меню)
2. Найди секцию **"Project API keys"**
3. Скопируй:
   - **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (СЕКРЕТНЫЙ!)

---

### 📋 Шаг 4: Добавить в Vercel Environment Variables

1. Зайди на https://vercel.com
2. Открой свой проект **icoffio-front**
3. **Settings** → **Environment Variables**
4. Добавь 2 новых:

```bash
# Supabase URL
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Supabase Service Role Key (секретный!)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. Выбери **"All Environments"** (Production, Preview, Development)
6. Нажми **"Save"**

---

### 📋 Шаг 5: Установить Supabase клиент

```bash
npm install @supabase/supabase-js
```

---

### 📋 Шаг 6: Redeploy на Vercel

После добавления environment variables:

1. Зайди в **Deployments**
2. Найди последний deployment
3. Нажми **"... (три точки)"** → **"Redeploy"**
4. Жди 2-3 минуты

---

### ✅ Проверка что все работает

После deploy отправь в Telegram Bot:

```
/start
```

Должно:
1. Сохранить твой `chat_id` в `user_preferences`
2. Записать команду в `usage_logs`

Проверь в Supabase:
1. **"Table Editor"** → **"user_preferences"**
2. Должна быть 1 строка с твоим `chat_id`

---

## 🔐 ВАЖНО: Безопасность

### ⚠️ НИКОГДА НЕ КОММИТЬ В GIT:
- ❌ `SUPABASE_SERVICE_KEY` (секретный ключ)
- ❌ Database password

### ✅ БЕЗОПАСНО:
- ✅ `SUPABASE_URL` (публичный)
- ✅ `anon public` key (публичный, но с RLS)

### 🔒 Row Level Security (RLS)

RLS уже настроен в `schema.sql`:
- Admin role видит все данные
- User role (будущее) видит только свои данные

---

## 📊 Просмотр статистики

### Вариант 1: Supabase Dashboard

1. **"Table Editor"** → выбери таблицу
2. Просмотр данных в реальном времени

### Вариант 2: SQL Editor (Custom Queries)

```sql
-- Топ пользователей по статьям
SELECT * FROM user_statistics 
ORDER BY published_articles DESC 
LIMIT 10;

-- Глобальная статистика
SELECT * FROM global_statistics;

-- Статистика по категориям
SELECT * FROM category_statistics;

-- Последние 10 статей
SELECT 
  chat_id, 
  title, 
  category, 
  word_count, 
  created_at 
FROM published_articles 
ORDER BY created_at DESC 
LIMIT 10;
```

### Вариант 3: API Endpoint (после deploy v7.0.0)

```bash
# GET статистика
curl https://app.icoffio.com/api/telegram/stats

# GET пользователи
curl https://app.icoffio.com/api/telegram/stats/users

# GET статьи
curl https://app.icoffio.com/api/telegram/stats/articles
```

---

## 🎯 Free Tier Limits

Supabase Free Plan:
- ✅ 500 MB Database
- ✅ 50,000 monthly active users
- ✅ 2 GB bandwidth
- ✅ 500 MB file storage
- ✅ Unlimited API requests

**Более чем достаточно для Telegram бота!**

---

## 🆘 Troubleshooting

### Проблема: "Invalid API key"
**Решение:** Проверь что скопировал правильный ключ (service_role, не anon)

### Проблема: "relation does not exist"
**Решение:** Запусти `schema.sql` снова в SQL Editor

### Проблема: "connection timeout"
**Решение:** Проверь SUPABASE_URL в Vercel environment variables

### Проблема: Нет данных в таблицах
**Решение:** 
1. Проверь что Vercel redeployed после добавления env vars
2. Отправь `/start` в Telegram Bot
3. Проверь логи в Vercel

---

## 📚 Полезные ссылки

- 📖 Supabase Docs: https://supabase.com/docs
- 🔧 Supabase JS Client: https://supabase.com/docs/reference/javascript
- 🗄️ PostgreSQL Docs: https://www.postgresql.org/docs/

---

**Готово! После setup переходи к тестированию.** ✅








