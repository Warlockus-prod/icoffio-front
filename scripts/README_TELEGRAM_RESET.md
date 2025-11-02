# 🔧 TELEGRAM BOT АВТОМАТИЧЕСКИЙ СБРОС

**Версия:** v7.14.1  
**Дата:** 2025-11-02

---

## 🚀 АВТОМАТИЧЕСКИЙ СБРОС (Рекомендуется)

### Вариант 1: Python скрипт (Простой)

**Шаг 1:** Создайте конфигурацию:

```bash
cp scripts/telegram-config.example.json scripts/telegram-config.json
```

**Шаг 2:** Откройте `scripts/telegram-config.json` и заполните токены:

```json
{
  "telegram": {
    "bot_token": "7999999999:AAGRJHxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "secret_token": "любая_случайная_строка_для_безопасности"
  },
  "supabase": {
    "url": "https://dlellopouivlmbrmjhoz.supabase.co",
    "service_role_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Где взять токены:**
- `telegram.bot_token` - от @BotFather в Telegram
- `telegram.secret_token` - любая случайная строка (например: `my_secret_webhook_token_2025`)
- `supabase.service_role_key` - из Supabase Dashboard → Settings → API

**Шаг 3:** Запустите скрипт:

```bash
chmod +x scripts/telegram-reset-simple.py
python3 scripts/telegram-reset-simple.py
```

**Должно вернуть:**
```
🚀 TELEGRAM BOT AUTOMATIC RESET v7.14.1
========================================

📋 Step 1/4: Loading configuration...
✅ Configuration loaded

📋 Step 2/4: Resetting Supabase queue...
   Deleting all jobs...
   ✅ All jobs deleted
   Verifying queue is empty...
   ✅ Queue is empty (0 jobs)

📋 Step 3/4: Managing Telegram webhook...
   Getting current webhook...
   Current: https://app.icoffio.com/api/telegram/webhook
   Deleting webhook...
   ✅ Webhook deleted
   Setting new webhook...
   ✅ Webhook set successfully
   Verifying webhook...
   ✅ Webhook verified: https://app.icoffio.com/api/telegram/webhook
   Pending updates: 0

📋 Step 4/4: Final status

======================================
✅ TELEGRAM BOT RESET COMPLETED!
======================================
```

**✅ ГОТОВО!** Теперь тестируйте в Telegram.

---

### Вариант 2: Bash скрипт (Unix/Linux/Mac)

**Требует:** `.env.local` с токенами

```bash
./scripts/telegram-reset-auto.sh
```

---

## 🧪 ТЕСТИРОВАНИЕ

После успешного сброса:

**1. Откройте Telegram бота**

**2. Отправьте:**
```
/start
```

**Должно:** Приветствие ✅

**3. Отправьте текст:**
```
AI revolutionizes education. Machine learning helps students.
```

**4. Ожидание:** 5-15 секунд

**5. Должно прийти:**
```
✅ ОПУБЛИКОВАНО!
⏱️ Время: 8s
🇬🇧 EN: https://app.icoffio.com/en/article/...
🇵🇱 PL: https://app.icoffio.com/pl/article/...
```

**6. Откройте URL** - статья должна открываться! ✅

---

## 📊 МОНИТОРИНГ

### Vercel Logs:

```
https://vercel.com/andreys-projects-a55f75b3/icoffio-front/logs
```

**Ищите:**
```
[Queue] 🚀 processQueue() called
[Queue] ✅ Starting queue processing...
[Queue] 📋 Found 1 pending job(s) in Supabase
[Queue] 🚀 Starting job: job_*
[Dual-Lang] Starting dual-language publishing
[Queue] ✅ Job completed: job_* (8s)
```

### Supabase Dashboard:

```
https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz
```

**SQL проверка:**
```sql
SELECT 
  id,
  type,
  status,
  created_at,
  started_at,
  completed_at
FROM telegram_jobs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🚨 TROUBLESHOOTING

### Ошибка: "Config file not found"

**Решение:**
```bash
cp scripts/telegram-config.example.json scripts/telegram-config.json
# Заполните токены
```

### Ошибка: "Please fill with real tokens"

**Решение:** Замените `YOUR_BOT_TOKEN` и `YOUR_SERVICE_ROLE_KEY` на реальные значения.

### Ошибка: "Failed to delete jobs"

**Решение:** Проверьте `service_role_key` в конфигурации. Должен быть именно Service Role Key, не Anon Key.

### Ошибка: "Failed to set webhook"

**Решение:** 
1. Проверьте `bot_token`
2. Убедитесь что нет пробелов в токене
3. Проверьте что бот активен в @BotFather

### Зависает при публикации

**Проверьте:**
1. Vercel deployment status (должен быть ✅ Ready)
2. Vercel logs на ошибки
3. Environment variables в Vercel (должны быть настроены)

---

## 📝 РУЧНОЙ СБРОС (если скрипты не работают)

### 1. Supabase SQL:

```sql
DELETE FROM telegram_jobs;
ALTER SEQUENCE IF EXISTS telegram_jobs_id_seq RESTART WITH 1;
SELECT COUNT(*) FROM telegram_jobs; -- Должно вернуть 0
```

### 2. Telegram Webhook (curl):

**Delete:**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"
```

**Set:**
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

**Verify:**
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

---

## 📚 ДОПОЛНИТЕЛЬНАЯ ДОКУМЕНТАЦИЯ

- **Полная инструкция:** `TELEGRAM_COMPLETE_RESET_v7.14.1.md`
- **Главная документация:** `PROJECT_MASTER_DOCUMENTATION.md`
- **Changelog:** `CHANGELOG.md`

---

## ✅ КРИТЕРИИ УСПЕХА

- [ ] Python скрипт выполнился без ошибок
- [ ] Supabase queue = 0 jobs
- [ ] Webhook установлен (getWebhookInfo показывает правильный URL)
- [ ] `/start` в Telegram работает
- [ ] Текст публикуется < 20 секунд
- [ ] URL открываются
- [ ] Vercel logs показывают успешную обработку

**Если всё ✅ → Telegram работает!** 🎉

---

**v7.14.1 - Serverless Queue Fix** 🚀

