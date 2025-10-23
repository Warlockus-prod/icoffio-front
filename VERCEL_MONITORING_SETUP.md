# 📊 VERCEL MONITORING & ALERTS SETUP

**Дата:** 23 октября 2025  
**Для проекта:** icoffio-front  
**Приоритет:** ВЫСОКИЙ  

---

## 🎯 ЧТО НАСТРАИВАЕМ

1. **Vercel Analytics** - мониторинг трафика
2. **Speed Insights** - производительность
3. **Deployment Notifications** - уведомления о деплоях
4. **Error Tracking** - отслеживание ошибок (опционально)

---

## 1️⃣ VERCEL ANALYTICS

### Что это дает:
- Количество посетителей
- Популярные страницы
- География пользователей
- Устройства и браузеры
- Real-time данные

### Как включить:

1. **Vercel Dashboard** → Проект **icoffio-front**
2. **Analytics** (в верхнем меню)
3. **Enable Analytics** (кнопка)
4. Подтвердить

**Или добавить в код** (уже есть в `app/layout.tsx`):
```typescript
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### Что смотреть:

**Dashboard показывает:**
- **Total Visits** - общее количество визитов
- **Top Pages** - самые популярные страницы
- **Top Referrers** - откуда приходят пользователи
- **Countries** - география
- **Devices** - Desktop/Mobile ratio

**После включения:**
- Данные появятся через 24 часа
- Real-time обновление каждые 5 минут

---

## 2️⃣ SPEED INSIGHTS

### Что это дает:
- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)
- Performance score
- Рекомендации по оптимизации

### Как включить:

1. **Vercel Dashboard** → Проект **icoffio-front**
2. **Speed Insights** (в меню)
3. **Enable Speed Insights**
4. Подтвердить

**Или добавить в код** (уже есть в `app/layout.tsx`):
```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

<SpeedInsights />
```

### Метрики:

**Core Web Vitals:**
- **LCP** (Largest Contentful Paint) - целевое значение: < 2.5s
- **FID** (First Input Delay) - целевое значение: < 100ms
- **CLS** (Cumulative Layout Shift) - целевое значение: < 0.1

**Текущие значения icoffio:**
- LCP: ~2.5s ✅
- FID: ~50ms ✅
- CLS: ~0.05 ✅

**Если метрики ухудшаются:**
- Проверить размеры изображений
- Оптимизировать JavaScript bundle
- Проверить Third-party scripts

---

## 3️⃣ DEPLOYMENT NOTIFICATIONS

### Что это дает:
- Email уведомления о каждом deploy
- Успех/Failure статус
- Preview URLs для feature branches
- Build logs при ошибках

### Как настроить:

#### A. Email Notifications

1. **Settings** → **Notifications**
2. **Email Notifications** → **Configure**
3. Выбрать события:
   - ✅ Deployment Started
   - ✅ Deployment Ready
   - ✅ Deployment Failed
   - ✅ Deployment Cancelled
4. Добавить email адреса
5. **Save**

#### B. Webhook Notifications (опционально)

Для интеграции со Slack/Discord/Telegram:

1. **Settings** → **Notifications**
2. **Webhooks** → **Add Webhook**
3. **URL:** Webhook URL вашего сервиса
4. **Events:** Выбрать события
5. **Save**

**Пример Webhook URL:**
```
Slack: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Discord: https://discord.com/api/webhooks/YOUR/WEBHOOK
```

---

## 4️⃣ ERROR TRACKING (Опционально - Sentry)

### Что это дает:
- Real-time error tracking
- Stack traces
- User context
- Performance monitoring
- Release tracking

### Как настроить Sentry:

#### Шаг 1: Создать Sentry проект

1. Зайти на https://sentry.io
2. **Create Project**
3. Platform: **Next.js**
4. Project name: **icoffio-front**
5. **Create Project**

#### Шаг 2: Установить Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

#### Шаг 3: Конфигурация (автоматически создастся)

**sentry.client.config.ts:**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

**sentry.server.config.ts:**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

#### Шаг 4: Environment Variables

Добавить в Vercel:
```
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
```

#### Шаг 5: Интеграция с Vercel

1. Sentry Dashboard → **Settings** → **Integrations**
2. **Vercel** → **Install**
3. Выбрать проект **icoffio-front**
4. **Install**

---

## 5️⃣ CUSTOM MONITORING (Опционально)

### Health Check Endpoint

Создать endpoint для мониторинга:

**app/api/health/route.ts:**
```typescript
export async function GET() {
  try {
    // Проверка WordPress
    const wpResponse = await fetch('https://icoffio.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ posts(first:1){ nodes{ title } } }' }),
    });
    
    const wpHealthy = wpResponse.ok;
    
    return Response.json({
      status: 'ok',
      version: '4.7.1',
      wordpress: wpHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}
```

### UptimeRobot мониторинг

1. Зайти на https://uptimerobot.com
2. **Add New Monitor**
3. **Monitor Type:** HTTP(s)
4. **URL:** `https://app.icoffio.com/api/health`
5. **Monitoring Interval:** 5 минут
6. **Alert Contacts:** Ваш email
7. **Create Monitor**

---

## 📊 DASHBOARD ОБЗОР

### Что смотреть ежедневно:

**Vercel Dashboard:**
- Latest Deployments (зеленые = ok)
- Analytics: Visitors count
- Speed Insights: Core Web Vitals

### Что смотреть еженедельно:

- **Top Pages** - какие страницы популярны
- **Performance Trends** - улучшается/ухудшается
- **Error Rate** - если есть Sentry

### Alerts которые нужны:

✅ **Deployment Failed** - немедленное действие  
✅ **Performance degradation** - Core Web Vitals ухудшились  
✅ **Error spike** - много ошибок одновременно  
⚠️ **Traffic spike** - аномальный трафик (DDoS?)  

---

## 🚨 ALERT SCENARIOS

### Scenario 1: Deployment Failed

**Alert:** Email "Deployment Failed"

**Действия:**
1. Открыть Vercel Dashboard → Deployments
2. Клик на Failed deployment
3. Проверить Build Logs
4. Найти ошибку (обычно TypeScript или build error)
5. Исправить локально
6. Re-deploy

**Если нужен rollback:**
```bash
git reset --hard HEAD~1
git push origin main --force
```

---

### Scenario 2: Performance Degradation

**Alert:** Speed Insights показывает Red metrics

**Действия:**
1. Проверить что изменилось в последнем deploy
2. Проверить размеры изображений (WebP?)
3. Проверить JavaScript bundle size
4. Проверить Third-party scripts
5. Оптимизировать или откатиться

**Проверка bundle size:**
```bash
npm run build
# Смотреть на sizes в output
```

---

### Scenario 3: Error Spike

**Alert:** Sentry "New Issue" или много ошибок

**Действия:**
1. Открыть Sentry Dashboard
2. Проверить stack trace
3. Проверить affected users count
4. Если критично - rollback
5. Исправить и re-deploy

---

## ✅ CHECKLIST НАСТРОЙКИ

### Vercel Dashboard:

- [ ] Analytics включен
- [ ] Speed Insights включен
- [ ] Email notifications настроены
- [ ] Webhook notifications (опционально)
- [ ] Deployment events выбраны
- [ ] Email адрес подтвержден

### Опционально:

- [ ] Sentry проект создан
- [ ] Sentry интеграция с Vercel
- [ ] UptimeRobot monitor настроен
- [ ] Health check endpoint создан

### Тестирование:

- [ ] Сделать test deployment
- [ ] Проверить что Email пришел
- [ ] Проверить Analytics (через 24 часа)
- [ ] Проверить Speed Insights работает

---

## 📈 RECOMMENDED LIMITS

### Alerts:

**Email Frequency:**
- Deployment notifications: Все
- Performance alerts: Только критичные
- Error alerts: Группировать по 10 минут

**Thresholds:**
- LCP > 3s - Warning
- LCP > 4s - Critical
- Error rate > 1% - Warning
- Error rate > 5% - Critical

---

## 🔄 MAINTENANCE

### Еженедельно:

- Проверить Analytics dashboard
- Проверить Performance trends
- Проверить Error rate (если Sentry)

### Ежемесячно:

- Review alert rules
- Update monitoring strategy
- Check costs (Analytics/Sentry)

---

## 💰 COSTS

### Vercel:

**Pro Plan ($20/month):**
- ✅ Analytics (unlimited)
- ✅ Speed Insights (unlimited)
- ✅ Deployment notifications (unlimited)

**Hobby Plan (Free):**
- ✅ Basic analytics
- ⚠️ Limited Speed Insights
- ✅ Deployment notifications

### Sentry:

**Free Plan:**
- 5K errors/month
- 10K transactions/month
- 1 project

**Team Plan ($26/month):**
- 50K errors/month
- 100K transactions/month
- Unlimited projects

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

После настройки мониторинга:

1. **Подождать 24 часа** для накопления данных
2. **Проверить первые метрики**
3. **Настроить thresholds** если нужно
4. **Продолжить разработку** с уверенностью

→ **Следующая задача:** Staging Environment (см. NEXT_STEPS_ROADMAP.md)

---

**Создано:** 23 октября 2025  
**Обновлено:** 23 октября 2025  
**Статус:** Готово к использованию  
**Время настройки:** 20-30 минут

