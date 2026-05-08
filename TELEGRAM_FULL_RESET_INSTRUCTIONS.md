# 🔄 TELEGRAM ПОЛНЫЙ СБРОС - ИНСТРУКЦИИ

**Дата:** 2025-11-02  
**Причина:** Очередь зависает, нужен полный сброс с нуля  
**Публикация:** Front (Docker/VPS#2 + PostgreSQL) БЕЗ WordPress  
**Статус:** ВРЕМЕННЫЙ (удалить после успеха)

---

## ШАГ 1: ОЧИСТКА SUPABASE QUEUE (1 минута)

### Откройте Supabase SQL Editor:
```
https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz/sql/new
```

### Выполните SQL:
```sql
-- 1. Удалить все задания
DELETE FROM telegram_jobs;

-- 2. Сбросить sequence
ALTER SEQUENCE IF EXISTS telegram_jobs_id_seq RESTART WITH 1;

-- 3. Проверка (должно быть 0)
SELECT COUNT(*) as total_jobs FROM telegram_jobs;
```

**Результат:** `total_jobs: 0` ✅

---

## ШАГ 2: ПЕРЕСОЗДАНИЕ TELEGRAM WEBHOOK (Python скрипт)

### Создайте файл конфигурации:
```bash
cd /Users/Andrey/App/icoffio-front
nano telegram-reset-config.json
```

### Вставьте (ЗАМЕНИТЕ токены):
```json
{
  "telegram_bot_token": "ВАШ_TELEGRAM_BOT_TOKEN",
  "telegram_secret_token": "любая_случайная_строка_32_символа",
  "webhook_url": "https://app.icoffio.com/api/telegram-simple/webhook"
}
```

### Запустите скрипт:
```bash
python3 telegram-reset-webhook.py
```

**Результат:** `✅ Webhook установлен` + `✅ Webhook активен`

---

## ШАГ 3: ПРОВЕРКА ЦЕПОЧКИ ПУБЛИКАЦИИ

### Цепочка БЕЗ WordPress:

```
Telegram Bot
    ↓
webhook: /api/telegram/webhook
    ↓
addJob() → Supabase (telegram_jobs)
    ↓
processQueue() → publishDualLanguageArticle()
    ↓
/api/admin/generate-article-content (AI)
    ↓
/api/admin/publish-article (Supabase ПРЯМО)
    ↓
published_articles таблица (БЕЗ WordPress!)
    ↓
URL: app.icoffio.com/en/article/slug
```

### Проверка endpoint:
```bash
curl https://app.icoffio.com/api/admin/publish-article
```

**Ожидание:**
```json
{
  "service": "Article Publisher",
  "version": "7.14.5",
  "storage": "Supabase",
  "supabase": {
    "configured": true,
    "status": "connected"
  }
}
```

✅ **НЕТ WordPress!**

---

## ШАГ 4: ТЕСТ (30 секунд)

### В Telegram боте:
```
/start
```

### Отправьте текст:
```
AI revolutionizes education. Machine learning helps students learn faster with personalized content.
```

### Ожидание (30-50 сек):
```
✅ ОПУБЛИКОВАНО!
🇬🇧 EN: https://app.icoffio.com/en/article/...
🇵🇱 PL: https://app.icoffio.com/pl/article/...
```

### Откройте URL:
- Должна открыться статья ✅
- На сайте app.icoffio.com (НЕ icoffio.com!) ✅
- В базе Supabase (НЕ WordPress!) ✅

---

## 🔍 ДИАГНОСТИКА (если не работает):

### 1. Проверьте container logs (VPS#2):
```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 root@178.104.223.93 \
  'docker logs --tail 200 icoffio-front-app 2>&1'
```

Ищите:
```
[Queue] 🚀 processQueue() called
[DualLang] Publishing EN...
[DualLang] Published EN successfully
```

### 2. Проверьте Supabase:
```sql
SELECT id, type, status, created_at, error 
FROM telegram_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Проверьте published_articles:
```sql
SELECT id, title, slug_en, slug_pl, created_at 
FROM published_articles 
ORDER BY created_at DESC 
LIMIT 5;
```

**Статьи должны быть здесь!** (НЕ в WordPress)

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ:

| Проверка | Результат |
|----------|-----------|
| Supabase queue | 0 заданий после reset ✅ |
| Webhook | Активен ✅ |
| Endpoint | version: 7.14.5, storage: Supabase ✅ |
| Публикация | 30-50 сек ✅ |
| URL | app.icoffio.com/en/article/... ✅ |
| База | published_articles (Supabase) ✅ |

---

## ⚠️ ВАЖНО:

**WordPress НЕ ИСПОЛЬЗУЕТСЯ!**
- ❌ Не пишем в icoffio.com
- ❌ Не используем WordPress API
- ✅ Пишем ПРЯМО в Supabase
- ✅ Читаем из Supabase
- ✅ Front: app.icoffio.com

---

**Следующий шаг:** Выполните ШАГ 1 (SQL), потом скажите "готово"
