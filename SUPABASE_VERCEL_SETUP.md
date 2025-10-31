# 🔧 КРИТИЧЕСКОЕ: Настройка Supabase на Vercel

**Проблема:** Telegram бот НЕ работает - задачи не сохраняются в очереди

**Причина:** Supabase НЕ настроен на Vercel → используется in-memory queue → serverless убивает процесс → память очищается

**Лог ошибки:**
```
[Queue] ❌❌❌ CRITICAL: Supabase NOT configured! In-memory queue will NOT work in serverless!
```

---

## ✅ БЫСТРАЯ ИНСТРУКЦИЯ (5 минут)

### Шаг 1: Получить Supabase credentials ⏱️ 2 мин

1. Зайди на **https://supabase.com** (войди через GitHub)

2. Выбери проект **или создай новый:**
   - Если проекта НЕТ: **New Project** → Name: `icoffio-telegram-bot` → Region: Europe → Free plan
   - Если проект ЕСТЬ: открой его

3. **Settings** → **API** (левое меню)

4. **Скопируй два значения:**

   ```
   📋 Project URL:
   https://xxxxxxxxxxxxx.supabase.co
   
   📋 service_role (secret):
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   (очень длинный токен, ~200+ символов)
   ```

⚠️ **ВАЖНО:** Используй именно **service_role**, НЕ anon!

---

### Шаг 2: Добавить в Vercel ⏱️ 2 мин

1. Зайди на **Vercel:**  
   https://vercel.com/warlockus-prod/icoffio-front

2. **Settings** → **Environment Variables**

3. **Добавь первую переменную:**
   - Click: **Add New**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://xxxxxxxxxxxxx.supabase.co` (вставь Project URL)
   - Environments: ✅ Production ✅ Preview ✅ Development
   - Click: **Save**

4. **Добавь вторую переменную:**
   - Click: **Add New** (еще раз)
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (вставь service_role токен)
   - Environments: ✅ Production ✅ Preview ✅ Development
   - Click: **Save**

**Должно получиться:**
```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Шаг 3: Создать таблицу в Supabase ⏱️ 1 мин

1. **Supabase Dashboard** → **SQL Editor** (левое меню)

2. Click: **New Query**

3. **Скопируй и вставь** весь SQL код:

```sql
-- ============================================
-- TELEGRAM JOBS QUEUE TABLE
-- Migration v7.9.2 - Persistent Queue Storage
-- ============================================

-- Создать таблицу для хранения заданий
CREATE TABLE IF NOT EXISTS telegram_jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'text-generate', 'url-parse'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  data JSONB NOT NULL, -- Job data (text, url, chatId, etc)
  result JSONB, -- Job result
  error TEXT,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_jobs_status ON telegram_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON telegram_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON telegram_jobs(created_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_telegram_jobs_updated_at BEFORE UPDATE
    ON telegram_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE telegram_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON telegram_jobs FOR ALL USING (true);

-- Комментарий
COMMENT ON TABLE telegram_jobs IS 'Очередь заданий для персистентного хранения (Queue Storage) v7.9.2';
```

4. Click: **Run** (или нажми `Ctrl+Enter`)

5. **Проверь что таблица создана:**
   - Перейди в **Table Editor** (левое меню)
   - Найди таблицу `telegram_jobs`
   - Должна быть пустая (0 rows)

---

### Шаг 4: Redeploy на Vercel (АВТОМАТИЧЕСКИ)

Vercel автоматически задеплоит после добавления environment variables.

**Подожди 2-3 минуты**, затем проверь:

---

## 🧪 ТЕСТИРОВАНИЕ

### 1️⃣ Отправь текст в бота:
```
У Perplexity есть гайд по использованию ИИ в работе со своими инструментами конечно же.

Гайд на 42 страницы и делит использование ИИ на три слоя: 

1/ убрать отвлечения
2/ масштабировать себя 
3/ получить результаты
...
```

### 2️⃣ Получишь подтверждение:
```
✨ Текст получен!
📝 Заголовок: У Perplexity есть гайд...
📋 Добавлено в очередь: job_xxx
🤖 AI генерирует статью...
⏳ Ожидайте (~60 секунд)
```

### 3️⃣ Проверь очередь:
```
/queue

📊 Статус очереди:
📋 Всего заданий: 1       ← ДОЛЖНО быть ≥1!
⏳ В ожидании: 0
⚙️ Обрабатывается: 1      ← Задача обрабатывается!
✅ Завершено: 0
❌ Ошибки: 0
```

### 4️⃣ Через ~60 секунд получишь:
```
✅ ОПУБЛИКОВАНО!
📝 Заголовок: ...
💬 Слов: 450
⏱️ Время: 58s
🔗 URL: https://app.icoffio.com/...
✨ Статус: Опубликовано на сайте!
```

---

## 🎯 Проверка в Vercel Logs

После настройки логи должны показывать:

**БЫЛО (❌ БЕЗ Supabase):**
```
[Queue] ❌❌❌ CRITICAL: Supabase NOT configured!
[Queue] ⚠️ Supabase NOT configured, using in-memory
[Queue] 💾 Using in-memory queue for: job_xxx
```

**СТАЛО (✅ С Supabase):**
```
[Queue] 🔑 Checking Supabase credentials: { url: '✅ SET', key: '✅ SET' }
[Queue] ✅ Supabase client initialized successfully
[Queue] ✅ Job added to Supabase: job_xxx
[Queue] 🚀 Starting job: job_xxx (type: text-generate)
[Queue] ✅ Job completed: job_xxx (58s)
```

---

## 📊 Мониторинг в Supabase

После настройки можешь мониторить очередь в реальном времени:

1. **Supabase** → **Table Editor** → `telegram_jobs`

2. **Посмотреть статистику:**
   ```sql
   SELECT status, COUNT(*) as count 
   FROM telegram_jobs 
   GROUP BY status;
   ```

3. **Последние задания:**
   ```sql
   SELECT id, type, status, 
          data->>'chatId' as chat_id,
          result->>'title' as title,
          created_at, completed_at
   FROM telegram_jobs 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 🚨 Troubleshooting

### Проблема: "Invalid API key"
**Решение:** Проверь что используешь **service_role**, а не anon key

### Проблема: "Table telegram_jobs does not exist"
**Решение:** Выполни SQL миграцию из Шага 3

### Проблема: Все еще показывает "Supabase NOT configured"
**Решение:** 
1. Проверь что environment variables сохранены на Vercel
2. Подожди 2-3 минуты для redeploy
3. Проверь что имена переменных точно совпадают:
   - `NEXT_PUBLIC_SUPABASE_URL` (с префиксом NEXT_PUBLIC_)
   - `SUPABASE_SERVICE_ROLE_KEY` (с суффиксом _ROLE_KEY)

---

## ✅ Чек-лист

- [ ] Получил Supabase Project URL
- [ ] Получил service_role key
- [ ] Добавил NEXT_PUBLIC_SUPABASE_URL на Vercel
- [ ] Добавил SUPABASE_SERVICE_ROLE_KEY на Vercel
- [ ] Выполнил SQL миграцию в Supabase
- [ ] Проверил что таблица telegram_jobs создана
- [ ] Подождал 2-3 минуты для redeploy
- [ ] Протестировал бота
- [ ] /queue показывает задания
- [ ] Получил уведомление об успехе

---

**После настройки Telegram бот будет работать СТАБИЛЬНО!** 🎉

_Создано: 2025-10-31_  
_Version: v7.12.1_

