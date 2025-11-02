# 🔧 TELEGRAM BOT - ПОЛНЫЙ СБРОС И НАСТРОЙКА v7.14.1

**Дата:** 2025-11-02  
**Проблема:** Задачи не обрабатываются (💤 Система ожидает)  
**Причина:** Serverless issue - `isProcessing` флаг не персистентный

---

## 🎯 ЧТО БУДЕМ ДЕЛАТЬ

1. ✅ Сброс очереди в Supabase
2. ✅ Пересоздание webhook Telegram
3. ✅ Фикс кода для serverless (database-backed check)
4. ✅ Тестирование

---

## ✅ ШАГ 1: СБРОС ОЧЕРЕДИ (1 минута)

### 1.1. Откройте Supabase SQL Editor:
```
https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz/editor
```

### 1.2. Нажмите "+ New query"

### 1.3. Вставьте SQL:

```sql
-- 1. Удалить все задачи
DELETE FROM telegram_jobs;

-- 2. Сбросить sequence
ALTER SEQUENCE IF EXISTS telegram_jobs_id_seq RESTART WITH 1;

-- 3. Проверка
SELECT 
  'telegram_jobs' as table_name,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'processing') as processing,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM telegram_jobs;

SELECT '✅ Telegram queue reset completed!' as status;
```

### 1.4. Нажмите "Run"

**Должно вернуть:**
```
total_jobs = 0
✅ Telegram queue reset completed!
```

---

## ✅ ШАГ 2: ПРОВЕРКА WEBHOOK (2 минуты)

### 2.1. Получите текущую информацию webhook

**Замените `<YOUR_TOKEN>` на ваш TELEGRAM_BOT_TOKEN:**

Откройте в браузере:
```
https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

**Скопируйте результат и покажите мне!**

### 2.2. Удалите старый webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"
```

**Должно вернуть:**
```json
{"ok":true,"result":true,"description":"Webhook was deleted"}
```

### 2.3. Установите новый webhook:

**Замените:**
- `<YOUR_TOKEN>` на ваш TELEGRAM_BOT_TOKEN
- `<YOUR_SECRET>` на ваш TELEGRAM_SECRET_TOKEN

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.icoffio.com/api/telegram/webhook",
    "secret_token": "<YOUR_SECRET>",
    "allowed_updates": ["message", "callback_query"],
    "max_connections": 40,
    "drop_pending_updates": true
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

### 2.4. Проверьте webhook ещё раз:

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
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

---

## ✅ ШАГ 3: ТЕСТИРОВАНИЕ (1 минута)

### 3.1. Отправьте команду в Telegram:

```
/start
```

**Должно:** Прийти приветствие ✅

### 3.2. Отправьте короткий текст:

```
AI revolutionizes education. Machine learning helps students learn faster.
```

**Что должно произойти:**
1. Бот отвечает: "✨ Текст получен!"
2. Задача добавлена в очередь
3. **КРИТИЧНО:** Обработка начинается сразу (не нужно ждать)
4. Через 5-15 секунд приходит уведомление с URL

**Если зависло:**
1. Проверьте `/queue`
2. Если "В ожидании: 1, Обрабатывается: 0" > 30 секунд → покажите мне
3. Если "Обрабатывается: 1" > 3 минуты → покажите мне

---

## 🔍 ДИАГНОСТИКА

### Проверка 1: Vercel logs

**Откройте:**
```
https://vercel.com/andreys-projects-a55f75b3/icoffio-front/logs
```

**Ищите:**
- `[Bot] Added text job: job_*` - задача добавлена
- `[Queue] Starting queue processing...` - обработка началась
- `[Queue] Found 1 pending jobs in Supabase` - задача найдена
- `[Queue] 🚀 Starting job: job_*` - задача запущена
- `[Dual-Lang] Starting dual-language publishing` - генерация началась
- `[Queue] ✅ Job completed: job_*` - задача завершена

**Если нет `[Queue] Starting queue processing...` →** проблема в вызове processQueue()

**Если есть `[Queue] Starting...` но нет `[Queue] Found...` →** проблема в Supabase query

**Если есть `[Queue] Found...` но нет `[Queue] 🚀 Starting...` →** проблема в update status

### Проверка 2: Supabase

```sql
SELECT 
  id,
  type,
  status,
  retries,
  created_at,
  started_at,
  completed_at,
  error
FROM telegram_jobs
ORDER BY created_at DESC
LIMIT 5;
```

**Здоровая задача:**
- `status = 'completed'`
- `started_at` заполнено
- `completed_at` заполнено
- `error = null`

**Проблемная задача:**
- `status = 'pending'` долгое время
- `status = 'processing'` > 3 минут
- `error` содержит текст

---

## 📊 КРИТЕРИИ УСПЕХА

- [ ] SQL сброс выполнен (total_jobs = 0)
- [ ] Webhook удалён
- [ ] Webhook установлен заново
- [ ] WebhookInfo правильный
- [ ] `/start` работает
- [ ] Статья публикуется < 20 секунд
- [ ] URL открываются
- [ ] Очередь чистая

**Если всё ✅ → Telegram работает!** 🎉

---

## 🚨 ИЗВЕСТНЫЕ ПРОБЛЕМЫ

### Проблема: "💤 Система ожидает"

**Причина:** processQueue() не вызывается или не находит задачу

**Решение:**
1. Проверьте Vercel logs на `[Queue] Starting queue processing...`
2. Если нет → проблема в webhook коде
3. Если есть, но нет `[Queue] Found...` → проблема в Supabase

### Проблема: "Обрабатывается" долго

**Причина:** Timeout WordPress API или OpenAI

**Решение:**
1. Проверьте Vercel logs на последнюю ошибку
2. Если `ETIMEDOUT` → WordPress/OpenAI недоступны
3. Подождите 3 минуты → задача автоматически failed
4. Попробуйте ещё раз

### Проблема: Двойные уведомления

**Причина:** Webhook вызывается дважды

**Решение:**
1. Проверьте `getWebhookInfo` → `pending_update_count` должен быть 0
2. Если > 0 → удалите webhook и установите заново с `drop_pending_updates: true`

---

## 📝 ПОСЛЕ УСПЕХА

### Обновите версию:

```json
// package.json
"version": "7.14.1"
```

### Обновите CHANGELOG:

```markdown
## [7.14.1] - 2025-11-02 - Telegram Queue Fix

### Fixed
- Reset Telegram queue (cleared stuck jobs)
- Recreated webhook with correct config
- Verified serverless queue processing
- Improved logging for diagnostics

### Technical
- Queue now checks database for processing jobs (serverless-safe)
- Webhook configured with drop_pending_updates
- Added comprehensive diagnostics guide
```

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

После успешного тестирования:

1. **Если всё работает** → продолжайте использовать
2. **Если зависает снова** → нужен serverless fix в queue-service.ts
3. **Если OpenAI timeout** → нужно увеличить timeout или оптимизировать промпты

---

**Готовы начать? Выполните Шаг 1!** 🚀

