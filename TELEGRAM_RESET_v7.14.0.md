# 🔧 TELEGRAM BOT RESET v7.14.0

**Дата:** 2025-11-02  
**Причина:** Зависшая очередь, нужен сброс с нуля

---

## ✅ ШАГ 1: СБРОС ОЧЕРЕДИ В SUPABASE (1 минута)

### 1.1. Откройте Supabase SQL Editor:
```
https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz/editor
```

### 1.2. Нажмите "+ New query"

### 1.3. Вставьте SQL:

```sql
-- Сброс очереди Telegram
DELETE FROM telegram_jobs;

-- Сброс счётчика (если есть)
ALTER SEQUENCE IF EXISTS telegram_jobs_id_seq RESTART WITH 1;

-- Проверка
SELECT 
  'telegram_jobs' as table_name,
  COUNT(*) as total_jobs
FROM telegram_jobs;

SELECT '✅ Queue reset completed!' as status;
```

### 1.4. Нажмите "Run"

**Должно вернуть:**
```
total_jobs = 0
✅ Queue reset completed!
```

---

## ✅ ШАГ 2: ПРОВЕРКА WEBHOOK (1 минута)

### 2.1. Проверьте текущий webhook:

Откройте в браузере (замените `<YOUR_TOKEN>`):
```
https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

**Должно быть:**
```json
{
  "ok": true,
  "result": {
    "url": "https://app.icoffio.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 2.2. Если webhook неправильный или отсутствует:

```bash
# Установить webhook заново
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.icoffio.com/api/telegram/webhook",
    "secret_token": "<YOUR_SECRET_TOKEN>"
  }'
```

**Должно вернуть:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

## ✅ ШАГ 3: ТЕСТИРОВАНИЕ (1 минута)

### 3.1. Откройте Telegram бота

### 3.2. Отправьте команду:
```
/start
```

**Должно прийти приветствие:** ✅

### 3.3. Отправьте короткий текст:
```
AI revolutionizes education. Machine learning helps students.
```

**Ожидание:** 5-10 секунд

**Должно прийти:**
```
✅ ОПУБЛИКОВАНО!
⏱️ Время: 8s
🇬🇧 EN: https://app.icoffio.com/en/article/...
🇵🇱 PL: https://app.icoffio.com/pl/article/...
```

### 3.4. Откройте URL

**Статья должна открываться!** ✅

---

## 🚨 ЕСЛИ НЕ РАБОТАЕТ

### Проблема 1: Бот не отвечает

**Решение:**
1. Проверьте webhook (Шаг 2.1)
2. Проверьте Vercel logs:
   ```
   https://vercel.com/dashboard → Latest → Logs
   ```
3. Найдите ошибки с `[Bot]` или `[Queue]`

### Проблема 2: Зависает при публикации

**Решение:**
1. Проверьте очередь:
   ```
   /queue
   ```

2. Если `Обрабатывается: 1` более 3 минут:
   ```sql
   -- В Supabase
   SELECT * FROM telegram_jobs 
   WHERE status = 'processing' 
   ORDER BY created_at DESC;
   ```

3. Если зависло - сбросить:
   ```sql
   UPDATE telegram_jobs 
   SET status = 'failed', 
       error = 'Timeout - manually reset'
   WHERE status = 'processing';
   ```

4. Попробуйте ещё раз

### Проблема 3: Приходит ошибка

**Решение:**
1. Проверьте Vercel logs
2. Проверьте Supabase:
   ```sql
   SELECT * FROM telegram_jobs 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
3. Посмотрите колонку `error` - там причина
4. Покажите мне ошибку

---

## 📊 ПРОВЕРКА СТАТУСА

### В Telegram:
```
/queue
```

**Здоровая очередь:**
```
📊 Статус очереди:
📋 Всего заданий: X
⏳ В ожидании: 0-2
⚙️ Обрабатывается: 0-1
✅ Завершено: X
❌ Ошибки: 0
```

### В Supabase:
```sql
SELECT 
  status,
  COUNT(*) as count
FROM telegram_jobs
GROUP BY status
ORDER BY status;
```

**Здоровая БД:**
```
pending: 0-2
processing: 0-1
completed: X
failed: 0
```

---

## ✅ КРИТЕРИИ УСПЕХА

- [ ] SQL сброс выполнен (total_jobs = 0)
- [ ] Webhook настроен правильно
- [ ] `/start` работает
- [ ] Статья публикуется < 15 секунд
- [ ] URL открываются
- [ ] Очередь чистая

**Если всё ✅ → Telegram восстановлен!** 🎉

---

## 📝 ПОСЛЕ СБРОСА

### Обновить CHANGELOG:
```markdown
## [7.14.1] - 2025-11-02 - Telegram Queue Reset

### Fixed
- Reset stuck Telegram queue
- Cleared all pending jobs
- Verified webhook configuration
```

### Обновить версию:
```json
// package.json
"version": "7.14.1"
```

---

**Telegram готов к работе!** 🚀

