# 🤖 TELEGRAM BOT SETUP GUIDE

**Phase 5: Telegram Bot with Queue System**
**Version:** 5.4.0

---

## 📋 OVERVIEW

Telegram bot для icoffio.com с системой очередей для обработки запросов.

**Возможности:**
- 🔗 **URL → Статья**: Отправь ссылку, получи готовую статью
- ✨ **Текст → Статья**: Отправь текст, AI создаст полную статью
- 📊 **Очередь**: Множество запросов обрабатываются по порядку
- 🤖 **AI-powered**: GPT-4o для генерации контента

---

## 🚀 QUICK START

### Шаг 1: Создай Telegram Bot

1. Открой Telegram, найди **@BotFather**
2. Отправь `/newbot`
3. Введи имя бота: `icoffio Article Bot`
4. Введи username: `icoffio_article_bot` (или другой)
5. Получишь токен: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### Шаг 2: Добавь переменные в Vercel

Открой: https://vercel.com/your-project/settings/environment-variables

**Добавь:**
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_SECRET=your_random_secret_string_here
```

*(TELEGRAM_BOT_SECRET - любая случайная строка для безопасности)*

### Шаг 3: Установи Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.icoffio.com/api/telegram/webhook",
    "secret_token": "your_random_secret_string_here"
  }'
```

Замени:
- `<YOUR_BOT_TOKEN>` → твой токен
- `your_random_secret_string_here` → твой TELEGRAM_BOT_SECRET

### Шаг 4: Тестируй!

1. Найди своего бота в Telegram
2. Отправь `/start`
3. Отправь URL или текст
4. Получи готовую статью!

---

## 💬 КОМАНДЫ БОТА

### Основные команды

| Команда | Описание |
|---------|----------|
| `/start` | Начало работы с ботом |
| `/help` | Подробная помощь |
| `/queue` | Статус очереди запросов |
| `/status` | Статус системы |

### Примеры использования

**1. Создание статьи из URL:**
```
https://techcrunch.com/2024/01/15/ai-breakthrough/
```
Бот спарсит статью и добавит в систему.

**2. Создание статьи из текста:**
```
Write about quantum computing breakthroughs in 2024 
and how they impact the tech industry
```
AI создаст полную статью (500-800 слов).

**3. Множество запросов:**
Отправь несколько URL/текстов подряд — они обработаются по очереди.

---

## 🔧 ARCHITECTURE

### Components

```
Telegram Bot
    ↓
Webhook (/api/telegram/webhook)
    ↓
Queue Service
    ↓ (sequential processing)
┌────────────────┬──────────────────┐
│   URL Parser   │  AI Copywriter   │
└────────────────┴──────────────────┘
    ↓
Article Created → Notification to User
```

### Queue System

**Features:**
- FIFO (First In, First Out)
- One request at a time (prevents overload)
- Auto-retry on failure (3 attempts)
- Status tracking
- Auto cleanup old jobs

**Flow:**
1. User sends message
2. Bot adds job to queue
3. Job processes sequentially
4. User receives updates
5. Job completes or fails

---

## 📊 QUEUE STATES

| State | Description |
|-------|-------------|
| `pending` | Waiting in queue |
| `processing` | Currently being processed |
| `completed` | Successfully finished |
| `failed` | Error occurred (after retries) |

---

## 🛠️ TECHNICAL DETAILS

### Files Created

1. **`lib/queue-service.ts`** (280 lines)
   - Queue management system
   - FIFO processing
   - Status tracking
   - Auto retry logic

2. **`app/api/telegram/webhook/route.ts`** (330 lines)
   - Telegram webhook handler
   - Command processing
   - Job monitoring
   - Status updates

3. **`docs/TELEGRAM_BOT_SETUP_GUIDE.md`** (this file)
   - Complete setup guide
   - Usage examples
   - Architecture documentation

### API Endpoints

**POST `/api/telegram/webhook`**
- Receives messages from Telegram
- Processes commands
- Adds jobs to queue
- Sends status updates

**GET `/api/telegram/webhook`**
- Health check
- Returns service status

### Environment Variables

```env
# Required
TELEGRAM_BOT_TOKEN=<bot_token_from_botfather>

# WordPress (IMPORTANT: admin subdomain!)
WORDPRESS_API_URL=https://admin.icoffio.com
WORDPRESS_USERNAME=<your_wp_username>
WORDPRESS_APP_PASSWORD=<your_wp_app_password>

# Optional (for security)
TELEGRAM_BOT_SECRET=<random_string>

# Already exists (used by bot)
OPENAI_API_KEY=<your_openai_key>
UNSPLASH_ACCESS_KEY=<your_unsplash_key>
```

---

## 🔒 SECURITY

### Webhook Verification

Bot verifies requests using `X-Telegram-Bot-Api-Secret-Token` header.

**Setup:**
```bash
# When setting webhook, include secret_token
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://app.icoffio.com/api/telegram/webhook" \
  -d "secret_token=your_secret_here"
```

### Best Practices

1. ✅ Use strong secret token (32+ characters)
2. ✅ Never commit tokens to git
3. ✅ Use Vercel environment variables
4. ✅ Enable webhook secret verification

---

## 🧪 TESTING

### Check Webhook Status

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

**Expected response:**
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

### Test Bot Locally

```bash
# Health check
curl https://app.icoffio.com/api/telegram/webhook

# Expected:
{
  "service": "Telegram Bot Webhook",
  "version": "1.0.0",
  "status": "active"
}
```

### Test Queue System

Send multiple messages to bot quickly:
1. Send URL
2. Send text
3. Send another URL
4. Use `/queue` to check status

All should process sequentially!

---

## 📈 MONITORING

### Queue Statistics

Use `/queue` command to see:
- Total jobs
- Pending jobs
- Currently processing
- Completed jobs
- Failed jobs

### Logs

Check Vercel logs for:
```
[Queue] Job added: job_xxx (type: url-parse)
[Queue] Processing job: job_xxx (2 remaining)
[Queue] Job completed: job_xxx
```

---

## 🐛 TROUBLESHOOTING

### Bot doesn't respond

**Check:**
1. Webhook set correctly? (`getWebhookInfo`)
2. TELEGRAM_BOT_TOKEN in Vercel?
3. Vercel deployment successful?

**Fix:**
```bash
# Reset webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://app.icoffio.com/api/telegram/webhook"
```

### Queue not processing

**Check logs for errors**

Common issues:
- OPENAI_API_KEY missing
- URL parser API unavailable
- Network timeout

**Solution:** Jobs auto-retry 3 times

### Messages not delivered

**Check:**
- `sendMessage` API calls succeeding?
- Bot not blocked by user?
- Rate limits not exceeded?

---

## 💡 USAGE EXAMPLES

### Example 1: Article from URL

**User sends:**
```
https://arstechnica.com/ai/2024/01/gpt-5-announcement/
```

**Bot responds:**
```
🔄 URL получен!
🔗 https://arstechnica.com/...
📋 Добавлено в очередь: job_xxx
⏳ Ожидайте обработки...

---

✅ Готово!
📝 Заголовок: GPT-5 Announcement...
💬 Слов: 850
⏱️ Время: 15s

✨ Статья создана и готова к публикации!
```

### Example 2: Article from Text

**User sends:**
```
Write about the latest Apple Vision Pro updates 
and how they improve productivity
```

**Bot responds:**
```
✨ Текст получен!
📝 Заголовок: Write about the latest...
📋 Добавлено в очередь: job_xxx
🤖 AI генерирует статью...
⏳ Ожидайте (~30 секунд)

---

✅ Готово!
📝 Заголовок: Apple Vision Pro: Latest Updates...
💬 Слов: 620
⏱️ Время: 28s

✨ Статья создана и готова к публикации!
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Create bot with @BotFather
- [ ] Add TELEGRAM_BOT_TOKEN to Vercel
- [ ] Add TELEGRAM_BOT_SECRET to Vercel
- [ ] Deploy code to Vercel
- [ ] Set webhook URL
- [ ] Test with /start command
- [ ] Test URL parsing
- [ ] Test text generation
- [ ] Test /queue command
- [ ] Monitor logs for errors

---

## 📞 SUPPORT

### Common Questions

**Q: Can I use this bot on multiple servers?**
A: Yes, webhook URL is server-specific.

**Q: How many requests can it handle?**
A: Unlimited! Queue processes them sequentially.

**Q: What's the timeout?**
A: 5 minutes per job (configurable).

**Q: Can I customize bot messages?**
A: Yes, edit `/api/telegram/webhook/route.ts`

---

## 🎉 READY TO USE!

Your Telegram bot is now ready to create articles automatically!

**Next steps:**
1. Add bot to your chat
2. Start sending URLs/text
3. Enjoy automated article creation!

---

**Version:** 5.4.0  
**Created:** October 24, 2025  
**Status:** Production Ready 🚀

