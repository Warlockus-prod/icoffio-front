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
  "database": {
    "url": "postgresql://icoffio:password@localhost:5432/icoffio"
  }
}
```

**Где взять токены:**
- `telegram.bot_token` - от @BotFather в Telegram
- `telegram.secret_token` - любая случайная строка (например: `my_secret_webhook_token_2025`)
- `database.url` - строка подключения к PostgreSQL

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

📋 Step 2/4: Resetting PostgreSQL queue...
   ✅ Queue is empty (0 jobs)

📋 Step 3/4: Managing Telegram webhook...
   Getting current webhook...
   Current: https://app.icoffio.com/api/telegram-simple/webhook
   Deleting webhook...
   ✅ Webhook deleted
   Setting new webhook...
   ✅ Webhook set successfully
   Verifying webhook...
   ✅ Webhook verified: https://app.icoffio.com/api/telegram-simple/webhook
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
[TelegramSimple] Incoming message
[TelegramSimple] Processing...
[TelegramSimple] Publishing dual-language
[TelegramSimple] ✅ Message sent to chat
```

### PostgreSQL:

```
docker compose -f docker-compose.vps.yml logs -f postgres
```

**SQL проверка:**
```sql
SELECT 
  id,
  submission_type,
  status,
  submitted_at,
  processed_at
FROM telegram_submissions
ORDER BY submitted_at DESC
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

**Решение:** Замените `YOUR_BOT_TOKEN` и `database.url` на реальные значения.

### Ошибка: "Failed to clear tables"

**Решение:** Проверьте `DATABASE_URL` (или доступ к контейнеру `icoffio-postgres`).

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

### 1. PostgreSQL SQL:

```sql
DELETE FROM telegram_jobs;
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
    "url": "https://app.icoffio.com/api/telegram-simple/webhook",
    "secret_token": "<YOUR_SECRET>",
    "allowed_updates": ["message", "edited_message", "channel_post", "edited_channel_post", "callback_query"],
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
- [ ] PostgreSQL queue = 0 jobs
- [ ] Webhook установлен (getWebhookInfo показывает правильный URL)
- [ ] `/start` в Telegram работает
- [ ] Текст публикуется < 20 секунд
- [ ] URL открываются
- [ ] Vercel logs показывают успешную обработку

**Если всё ✅ → Telegram работает!** 🎉

---

**v7.14.1 - Serverless Queue Fix** 🚀
