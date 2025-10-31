# 🔐 GITHUB SECRETS SETUP

Quick guide для настройки GitHub Secrets для Telegram notifications

---

## 📋 ТВОЙ CHAT ID

```
386781503
```

---

## 🚀 SETUP (5 минут):

### Шаг 1: Открой GitHub Secrets

```
1. Открой: https://github.com/Warlockus-prod/icoffio-front
2. Settings (вверху справа)
3. Secrets and variables → Actions (левая панель)
4. Click "New repository secret"
```

---

### Шаг 2: Добавь TELEGRAM_BOT_TOKEN

```
Name: TELEGRAM_BOT_TOKEN
Value: 7978267759:AAGuVKnd3Rz5oGgDIlYJBwhinUp1egVcq08

Click: Add secret
```

---

### Шаг 3: Добавь TELEGRAM_CHAT_ID

```
Name: TELEGRAM_CHAT_ID
Value: 386781503

Click: Add secret
```

---

### Шаг 4: (Optional) Добавь VERCEL_TOKEN

Для расширенного мониторинга Vercel через GitHub Actions:

```
1. Открой: https://vercel.com/account/tokens
2. Create Token
3. Name: "GitHub Actions Monitoring"
4. Expiration: No expiration
5. Scope: Full Access (или только Read)
6. Create
7. Copy token

GitHub:
Name: VERCEL_TOKEN
Value: [скопированный token]
```

---

### Шаг 5: (Optional) Добавь VERCEL_PROJECT_ID

```
1. Vercel Dashboard → icoffio-front
2. Settings → General
3. Find "Project ID" (внизу страницы)
4. Copy ID

GitHub:
Name: VERCEL_PROJECT_ID
Value: [скопированный ID]
```

---

## ✅ RESULT:

После настройки у тебя будут автоматические Telegram уведомления:

### 1. 🎉 Release Notifications

Каждый раз когда пушишь tag (например `v7.5.1`):

```
📦 NEW RELEASE: v7.5.0

🎉 Telegram Bot: Compose Mode + Delete Articles

✨ Key Updates:
- Multi-message article composition
- Article deletion by URL
- Inline keyboard buttons
- Bot menu commands (9 commands)

🌐 Live Site: app.icoffio.com
📝 Release Notes: [link]

🚀 Deployed to Vercel
```

**Workflow:** `.github/workflows/release-notification.yml` ✅

---

### 2. 🔍 Build Monitoring (Optional)

Если добавил VERCEL_TOKEN и VERCEL_PROJECT_ID:

**Success:**
```
✅ Vercel Deploy SUCCESS

Project: icoffio-front
Commit: 🐛 Fix TypeScript error
Author: Andrey
SHA: 8e7d525

🌐 app.icoffio.com
📊 Vercel Dashboard
```

**Failed:**
```
🚨 VERCEL BUILD FAILED!

Project: icoffio-front
Commit: ✨ Add new feature
Author: Andrey
SHA: abc1234

⚠️ Action Required:
1. Check build logs
2. Fix errors
3. Push fix

🔗 View Logs
📝 View Commit
```

**Workflow:** `.github/workflows/vercel-build-monitor.yml` ✅

---

## 🧪 TESTING:

### Test Release Notification:

```bash
# 1. Make a change
echo "# Test" >> README.md
git add README.md
git commit -m "test: Release notification"

# 2. Create tag
git tag v7.5.1

# 3. Push
git push origin main --tags

# 4. Wait 30 seconds
# Should receive Telegram notification! 🎉
```

---

### Test Build Monitor (if VERCEL tokens added):

```bash
# 1. Make a change
echo "# Test" >> README.md
git add README.md
git commit -m "test: Build monitoring"

# 2. Push
git push origin main

# 3. Wait 1-2 minutes
# Should receive build status notification! 📊
```

---

## 📊 WHAT'S ALREADY SET UP:

```
✅ Workflows Created:
  - .github/workflows/release-notification.yml
  - .github/workflows/vercel-build-monitor.yml

✅ Scripts Created:
  - scripts/notify-release.sh
  - scripts/notify-release-simple.sh

✅ Documentation:
  - docs/RELEASE_NOTIFICATIONS.md
  - docs/VERCEL_BUILD_MONITORING.md
  - docs/VERCEL_DEPLOYMENT_GUIDE.md

✅ Telegram Bot:
  - Token: 7978267759:AAGuVKnd...
  - Chat ID: 386781503
  - Menu: 9 commands (RU/PL/EN)
```

---

## 🔐 SECURITY NOTES:

### ✅ Good Practices:

1. **Never commit secrets to code**
   - Use GitHub Secrets only
   - Add to `.gitignore` if needed

2. **Limit token scope**
   - VERCEL_TOKEN: Read-only if possible
   - Expiration: 1 year max

3. **Rotate tokens regularly**
   - Every 6-12 months
   - If compromised: immediately

4. **Monitor usage**
   - Check GitHub Actions logs
   - Check Telegram bot logs

---

## 🎯 SUMMARY:

```
REQUIRED (для release notifications):
✅ TELEGRAM_BOT_TOKEN: 7978267759:AAGuVKnd...
✅ TELEGRAM_CHAT_ID: 386781503

OPTIONAL (для build monitoring):
🟡 VERCEL_TOKEN: [создай на vercel.com]
🟡 VERCEL_PROJECT_ID: [найди в settings]

WORKFLOWS:
✅ Release notifications: READY (нужны только required secrets)
🟡 Build monitoring: READY (нужны optional secrets)

TIME: 5 min (required) + 5 min (optional)
```

---

## 🚀 QUICK START:

**МИНИМУМ (5 минут):**
```
1. GitHub → Settings → Secrets → Actions
2. Add TELEGRAM_BOT_TOKEN
3. Add TELEGRAM_CHAT_ID
4. Done! Release notifications работают! ✅
```

**МАКСИМУМ (10 минут):**
```
5. Vercel → Account → Tokens → Create
6. Add VERCEL_TOKEN to GitHub
7. Add VERCEL_PROJECT_ID to GitHub
8. Done! Build monitoring тоже работает! ✅
```

---

**Last Updated:** 2025-10-28  
**Version:** v7.5.0  
**Your Chat ID:** 386781503  
**Status:** ✅ Ready to Configure






