# 🔍 VERCEL BUILD MONITORING

Автоматические уведомления в Telegram о статусе Vercel deployments

---

## 🎯 ЧТО ЭТО?

Система автоматически отправляет уведомления в Telegram:
- ✅ **Deploy Success** - когда build успешен
- 🚨 **Build Failed** - когда есть ошибки (TypeScript, Webpack, etc.)

**Больше никаких неожиданных failed deploys!**

---

## 🚀 НАСТРОЙКА (5 минут)

### Метод 1: Vercel Webhooks (Рекомендуется)

**Шаг 1: Добавить Secrets в Vercel**

1. Открой: https://vercel.com/dashboard
2. Выбери проект `icoffio-front`
3. Settings → Environment Variables
4. Добавь (если еще нет):
   ```
   TELEGRAM_BOT_TOKEN = 7978267759:AAGuVKnd3Rz5oGgDIlYJBwhinUp1egVcq08
   TELEGRAM_CHAT_ID = [твой Chat ID]
   ```
5. Нажми **Save**
6. **Redeploy** проект для применения переменных

**Шаг 2: Setup Webhook в Vercel**

1. В проекте: Settings → Git
2. Scroll down до **Deploy Hooks**
3. Нажми **Create Hook**
4. Заполни:
   ```
   Name: Build Status Notifications
   Branch: main (или оставь пустым для всех)
   URL: https://app.icoffio.com/api/vercel-webhook
   ```
5. Нажми **Create Hook**

**Шаг 3: Настроить Webhook Events (опционально)**

1. Settings → Integrations
2. Найди раздел **Webhooks**
3. Add Webhook:
   ```
   URL: https://app.icoffio.com/api/vercel-webhook
   Events:
   - ✅ deployment-ready (успешный deploy)
   - ✅ deployment-error (ошибка build)
   ```
4. Save

**Готово! Теперь каждый push → автоматическое уведомление!**

---

### Метод 2: GitHub Actions (Альтернатива)

Если не хочешь использовать Vercel webhooks, можно через GitHub Actions.

**Требует**:
- `VERCEL_TOKEN` (https://vercel.com/account/tokens)
- `VERCEL_PROJECT_ID` (Settings → General → Project ID)

**Setup**:
1. GitHub → Settings → Secrets → Actions
2. Добавь:
   - `VERCEL_TOKEN`
   - `VERCEL_PROJECT_ID`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

Workflow уже создан: `.github/workflows/vercel-build-monitor.yml`

---

## 📱 ПРИМЕРЫ УВЕДОМЛЕНИЙ

### ✅ Success Notification

```
✅ Vercel Deploy SUCCESS

Project: icoffio-front
Commit: 🐛 Fix TypeScript error
Author: Andrey
SHA: b911b84

🌐 app.icoffio.com
📊 Vercel Dashboard
```

### 🚨 Error Notification

```
🚨 VERCEL BUILD FAILED!

Project: icoffio-front
Commit: ✨ Add new feature
Author: Andrey
SHA: f8b3324

⚠️ Action Required:
1. Check build logs in Vercel
2. Fix TypeScript/build errors
3. Push fix to GitHub

🔗 View Logs
📝 View Commit
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Test 1: Check Webhook Endpoint

```bash
curl https://app.icoffio.com/api/vercel-webhook

# Response:
{
  "status": "active",
  "endpoint": "/api/vercel-webhook",
  "telegram_configured": true
}
```

### Test 2: Manual Webhook Test

```bash
curl -X POST https://app.icoffio.com/api/vercel-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deployment-ready",
    "payload": {
      "deployment": {
        "id": "test-123",
        "url": "app.icoffio.com",
        "name": "icoffio-front",
        "meta": {
          "githubCommitMessage": "Test deployment",
          "githubCommitSha": "abc123",
          "githubCommitAuthorName": "Tester"
        }
      },
      "project": {
        "name": "icoffio-front"
      }
    }
  }'

# Should send Telegram notification!
```

### Test 3: Trigger Real Deployment

```bash
# 1. Make a small change
echo "# Test" >> README.md

# 2. Commit & push
git add README.md
git commit -m "test: Trigger Vercel webhook"
git push origin main

# 3. Wait for Telegram notification (~1-2 min)
```

---

## 🔧 TROUBLESHOOTING

### ❌ No notifications received

**Проверь:**

1. **Environment Variables в Vercel**:
   ```bash
   # Vercel Dashboard → Settings → Environment Variables
   # Должны быть:
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID
   ```

2. **Webhook настроен?**:
   ```bash
   # Vercel Dashboard → Settings → Git → Deploy Hooks
   # Должен быть webhook на /api/vercel-webhook
   ```

3. **Endpoint доступен?**:
   ```bash
   curl https://app.icoffio.com/api/vercel-webhook
   # Должен вернуть: {"status":"active",...}
   ```

4. **Chat ID правильный?**:
   ```bash
   # Отправь /start боту @icoffio_bot
   # Скопируй Chat ID
   ```

### ⚠️ Getting error notifications for successful builds

**Причина**: Webhook может срабатывать на preview deployments тоже.

**Решение**:
```
Vercel → Settings → Git → Deploy Hooks → Edit
Specify Branch: main
```

### 🐛 Webhook returns 500 error

**Причина**: Telegram credentials не настроены или неверные.

**Решение**:
1. Проверь TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID
2. Redeploy после изменения env vars
3. Test endpoint: `curl https://app.icoffio.com/api/vercel-webhook`

---

## 📊 VERCEL WEBHOOK EVENTS

Vercel может отправлять разные типы событий:

| Event | Description | Notification |
|-------|-------------|--------------|
| `deployment` | Deployment started | ❌ No (too noisy) |
| `deployment-ready` | Build succeeded | ✅ Yes |
| `deployment-error` | Build failed | ✅ Yes |
| `deployment-cancelled` | Deployment cancelled | ❌ No |

---

## 🎯 BEST PRACTICES

### 1. Test Locally First

```bash
# Перед push проверяй локально:
npm run build
npx tsc --noEmit

# Если всё ОК → push
```

### 2. Use Pre-Deploy Script

```bash
# Создан скрипт для проверки:
./scripts/pre-deploy.sh
```

### 3. Monitor Regularly

```bash
# Проверяй Vercel Dashboard:
https://vercel.com/dashboard

# Логи последнего deployment:
vercel logs
```

### 4. Quick Rollback

```bash
# Если deploy failed:
# Vercel Dashboard → Deployments → Previous → Promote to Production

# Или через CLI:
vercel rollback
```

---

## 💡 ADVANCED: Custom Error Messages

Можешь кастомизировать сообщения в `app/api/vercel-webhook/route.ts`:

```typescript
// Пример: Добавить упоминание пользователя
await sendTelegramNotification(
  `🚨 <b>VERCEL BUILD FAILED!</b>\n\n` +
  `@andrey - нужен фикс!\n\n` +  // <-- Custom
  `<b>Commit:</b> ${commitMessage}\n` +
  // ...
);
```

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- **Vercel Webhooks Docs**: https://vercel.com/docs/observability/webhooks
- **Vercel API**: https://vercel.com/docs/rest-api
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Our Webhook Endpoint**: https://app.icoffio.com/api/vercel-webhook

---

## 📞 SUPPORT

**Проблемы с уведомлениями?**

1. Check `/api/vercel-webhook` endpoint
2. Check Vercel webhook logs
3. Check Telegram bot logs (Vercel → Functions → api/vercel-webhook)
4. Test manually with curl

---

**Last Updated**: 2025-10-28  
**Version**: 7.5.0  
**Status**: ✅ Active & Tested

