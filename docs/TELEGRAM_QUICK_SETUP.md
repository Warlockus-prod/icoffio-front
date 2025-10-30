# ⚡ TELEGRAM NOTIFICATIONS - QUICK SETUP

Быстрая настройка Telegram уведомлений (5 минут)

---

## 📋 ТВОИ ДАННЫЕ:

```
✅ Bot Token: 7978267759:AAGuVKnd3Rz5oGgDIlYJBwhinUp1egVcq08
✅ Chat ID: 386781503
✅ Bot: @icoffio_bot
```

---

## 🚀 SETUP (5 МИНУТ):

### Шаг 1: GitHub Secrets

```
1. Открой: https://github.com/Warlockus-prod/icoffio-front/settings/secrets/actions

2. Click: "New repository secret"

3. Добавь первый secret:
   Name: TELEGRAM_BOT_TOKEN
   Value: 7978267759:AAGuVKnd3Rz5oGgDIlYJBwhinUp1egVcq08
   [Add secret]

4. Добавь второй secret:
   Name: TELEGRAM_CHAT_ID
   Value: 386781503
   [Add secret]
```

**Готово!** ✅

---

## ✅ ЧТО ТЕПЕРЬ РАБОТАЕТ:

### 1. 📦 Release Notifications

Каждый раз когда создаешь новый release (tag):

```bash
git tag v7.5.1
git push origin --tags
```

Получаешь в Telegram:
```
📦 NEW RELEASE: v7.5.1

✨ Key Updates:
- Feature 1
- Feature 2
- Feature 3

🌐 app.icoffio.com
📝 Release Notes
🚀 Deployed
```

**Workflow:** `.github/workflows/release-notification.yml` ✅

---

### 2. 🔍 Build Monitoring (Optional)

Если хочешь мониторить каждый build:

**Нужно добавить:**
```
VERCEL_TOKEN (optional)
VERCEL_PROJECT_ID (optional)
```

**См. полную инструкцию:** `docs/GITHUB_SECRETS_SETUP.md`

**Workflow:** `.github/workflows/vercel-build-monitor.yml` ✅

---

## 🧪 TESTING:

### Test Release Notification:

```bash
# Terminal:
cd /Users/Andrey/App/icoffio-front/icoffio-clone-nextjs

# Create test commit
echo "# Test notification" >> README.md
git add README.md
git commit -m "test: Telegram notification"

# Create tag
git tag v7.5.1-test

# Push
git push origin main --tags

# Wait 30 seconds...
# Check Telegram! Should receive notification! 🎉
```

---

## 📊 STATUS:

```
SETUP COMPLETE:
✅ Bot Token: Set
✅ Chat ID: Set (386781503)
✅ Workflows: Ready
✅ Scripts: Ready
✅ Docs: Complete

NOTIFICATIONS:
✅ Release: Ready (after GitHub secrets setup)
🟡 Build: Ready (needs optional VERCEL tokens)

NEXT:
1. Add secrets to GitHub (5 min)
2. Test with tag push
3. Enjoy notifications! 🎉
```

---

## 🎯 SUMMARY:

```
WHAT YOU NEED TO DO:
1. GitHub → Settings → Secrets → Actions
2. Add TELEGRAM_BOT_TOKEN
3. Add TELEGRAM_CHAT_ID
4. Push tag to test
5. Done! ✅

TIME: 5 minutes
COST: FREE (GitHub Actions)
RESULT: Automatic Telegram notifications! 🎉
```

---

## 📚 FULL DOCS:

- **GitHub Secrets:** `docs/GITHUB_SECRETS_SETUP.md`
- **Release Notifications:** `docs/RELEASE_NOTIFICATIONS.md`
- **Build Monitoring:** `docs/VERCEL_BUILD_MONITORING.md`
- **Vercel Deployment:** `docs/VERCEL_DEPLOYMENT_GUIDE.md`

---

## 💡 TIPS:

1. **Don't commit secrets to code!**
   - Always use GitHub Secrets
   - Never hardcode tokens

2. **Test first**
   - Use `-test` suffix for test tags
   - Example: `v7.5.1-test`

3. **Monitor workflows**
   - GitHub → Actions tab
   - Check workflow runs
   - Debug if failed

4. **Rotate tokens**
   - Every 6-12 months
   - If compromised: immediately

---

**Last Updated:** 2025-10-28  
**Version:** v7.5.0  
**Your Chat ID:** 386781503  
**Status:** ✅ Ready for Setup





