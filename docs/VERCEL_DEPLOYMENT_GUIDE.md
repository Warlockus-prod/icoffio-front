# 🚀 VERCEL DEPLOYMENT GUIDE

Полное руководство по процессу деплоя icoffio на Vercel

---

## 📋 СОДЕРЖАНИЕ

1. [Как работает Vercel Deploy](#как-работает-vercel-deploy)
2. [Автоматический Deployment](#автоматический-deployment)
3. [Manual Deployment](#manual-deployment)
4. [Environment Variables](#environment-variables)
5. [Monitoring & Logs](#monitoring--logs)
6. [Troubleshooting](#troubleshooting)

---

## 🔄 КАК РАБОТАЕТ VERCEL DEPLOY

### Архитектура

```
GitHub Repository (main branch)
    ↓
GitHub Webhook → Vercel
    ↓
Vercel Build Process
    ├── Install Dependencies (npm install)
    ├── Run Build (npm run build)
    ├── TypeScript Check
    ├── Generate Static Pages
    └── Deploy to Edge Network
    ↓
Production URL: app.icoffio.com
```

### Build Process

1. **Trigger**: Push to `main` или Pull Request
2. **Install**: `npm install` (все зависимости из `package.json`)
3. **Build**: `npm run build` → `next build`
4. **Optimization**:
   - Image optimization
   - Code splitting
   - Tree shaking
   - Minification
5. **Deploy**: 
   - Edge Functions (API routes)
   - Static assets (images, CSS, JS)
   - Server-side rendering (SSR pages)

### Время Деплоя

- **Обычно**: 1-2 минуты
- **С кешем**: 30-60 секунд
- **Первый деплой**: 3-5 минут

---

## 🤖 АВТОМАТИЧЕСКИЙ DEPLOYMENT

### Когда происходит автоматически?

**Production Deployment** (app.icoffio.com):
- ✅ Push to `main` branch
- ✅ Tag push (v7.5.0, v7.6.0, etc.)
- ✅ Merge Pull Request to `main`

**Preview Deployment** (temporary URL):
- 📝 Push to feature branch
- 📝 Open Pull Request
- 📝 Commit to PR branch

### Процесс

```bash
# 1. Делаешь изменения локально
git add .
git commit -m "✨ Add new feature"

# 2. Push на GitHub
git push origin main

# 3. GitHub Webhook уведомляет Vercel

# 4. Vercel автоматически:
#    - Клонирует код
#    - Устанавливает зависимости
#    - Билдит проект
#    - Деплоит на Production

# 5. Через 1-2 минуты:
#    ✅ Deployment Complete
#    🌐 Live на app.icoffio.com
```

### GitHub Integration

Vercel интегрируется с GitHub через:
- **Webhooks**: Авто-деплой при push
- **Checks**: Status checks в PR
- **Comments**: Deployment URL в PR комментариях
- **Logs**: Build logs доступны в PR

---

## 🖱️ MANUAL DEPLOYMENT

### Через Vercel Dashboard

1. Открыть [vercel.com/dashboard](https://vercel.com/dashboard)
2. Выбрать проект `icoffio-front`
3. Нажать **"Redeploy"**
4. Выбрать commit или branch
5. Нажать **"Deploy"**

### Через Vercel CLI

```bash
# Установить Vercel CLI (один раз)
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Redeploy последний production
vercel --prod --force
```

### Через Git Tag

```bash
# Создать tag
git tag v7.5.0

# Push tag
git push origin v7.5.0

# Vercel автоматически деплоит
```

---

## 🔐 ENVIRONMENT VARIABLES

### Где хранятся?

**Vercel Dashboard** → Project → Settings → Environment Variables

### Важные переменные:

```bash
# WordPress
WORDPRESS_API_URL=https://icoffio.com
WP_USERNAME=admin
WP_APP_PASSWORD=*********

# OpenAI
OPENAI_API_KEY=sk-*********

# Telegram Bot
TELEGRAM_BOT_TOKEN=*********:*********
TELEGRAM_BOT_SECRET=*********
TELEGRAM_CHAT_ID=*********  # Для уведомлений о релизах

# Unsplash
UNSPLASH_ACCESS_KEY=*********

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://*****.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=*********
SUPABASE_SERVICE_ROLE_KEY=*********

# Site
NEXT_PUBLIC_SITE_URL=https://app.icoffio.com
```

### Добавление новых переменных:

1. **Dashboard**: Vercel → Settings → Environment Variables
2. **CLI**: `vercel env add VARIABLE_NAME`
3. **Redeploy** для применения: `vercel --prod`

⚠️ **Важно**: После изменения env vars нужен **redeploy**!

---

## 📊 MONITORING & LOGS

### Где смотреть логи?

**Vercel Dashboard**:
1. Открыть проект
2. Вкладка **"Deployments"**
3. Выбрать deployment
4. Tabs:
   - **"Building"**: Build logs
   - **"Runtime Logs"**: Function execution
   - **"Functions"**: API route logs

### Доступ к логам через CLI:

```bash
# Последние логи production
vercel logs

# Логи конкретной функции
vercel logs --function=api/telegram/webhook

# Follow logs (real-time)
vercel logs --follow
```

### Monitoring:

**Vercel Analytics** (встроенный):
- Page views
- Performance metrics
- Error tracking
- Function invocations

**External**:
- Google Analytics (уже настроен)
- Sentry (опционально, для error tracking)

---

## 🐛 TROUBLESHOOTING

### ❌ Build Failed

**Причина**: TypeScript ошибки, missing dependencies, etc.

**Решение**:
```bash
# Локально проверить build
npm run build

# Проверить TypeScript
npx tsc --noEmit

# Проверить зависимости
npm install

# Если всё ОК локально, но фейлит на Vercel:
# - Проверить Node version в Vercel settings
# - Проверить environment variables
```

### ⏱️ Function Timeout

**Причина**: Edge Functions timeout (default: 10 seconds)

**Решение**:
```typescript
// В API route добавить:
export const maxDuration = 300; // 5 минут (Pro plan)
export const runtime = 'nodejs'; // Или 'edge'
```

### 🔐 Unauthorized / 401 Errors

**Причина**: Missing или incorrect environment variables

**Решение**:
1. Проверить Vercel → Settings → Environment Variables
2. Убедиться что переменные set для Production
3. Redeploy после изменений

### 🐢 Slow Performance

**Причина**: Cold starts, large bundle size

**Решение**:
- Использовать Edge Runtime где возможно
- Code splitting
- Lazy loading компонентов
- Image optimization
- Кеширование

---

## 🎯 BEST PRACTICES

### 1. **Branching Strategy**

```bash
main          # Production (auto-deploy)
  ↓
feature/*     # Preview deployments
fix/*         # Bugfix previews
docs/*        # Documentation
```

### 2. **Commit Messages**

```bash
✨ Add: новая feature
🐛 Fix: баг фикс
📝 Docs: документация
🔖 Release: версия
```

### 3. **Testing Before Deploy**

```bash
# Локальная проверка:
npm run build              # Build проверка
npx tsc --noEmit           # TypeScript
npm run lint               # Linting
./scripts/pre-deploy.sh    # Pre-deploy checklist
```

### 4. **Environment Management**

- **Development**: `.env.local` (git ignored)
- **Preview**: Vercel preview env vars
- **Production**: Vercel production env vars

### 5. **Rollback Strategy**

```bash
# Откатить на предыдущую версию:
# Vercel Dashboard → Deployments → Previous deployment → "Promote to Production"

# Или через CLI:
vercel rollback
```

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deploy**: https://nextjs.org/docs/deployment
- **Edge Functions**: https://vercel.com/docs/functions/edge-functions
- **Environment Variables**: https://vercel.com/docs/projects/environment-variables

---

## 📞 SUPPORT

**Проблемы с деплоем?**
1. Проверить Build Logs в Vercel
2. Проверить Runtime Logs
3. Проверить Environment Variables
4. Проверить GitHub Integration
5. Contact Vercel Support (если Pro plan)

---

**Last Updated**: 2025-10-28  
**Version**: 7.5.0

