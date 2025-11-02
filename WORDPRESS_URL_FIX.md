# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: WordPress URL

## ❌ ТЕКУЩЕЕ СОСТОЯНИЕ

Статьи из Telegram бота публикуются на **СТАРЫЙ WordPress**:
- URL: `https://icoffio.com/blog/...`
- Пример: https://icoffio.com/blog/ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-3/

## 🎯 ДОЛЖНО БЫТЬ

Статьи должны публиковаться на **НОВЫЙ сайт**:
- Frontend: `https://app.icoffio.com`
- WordPress API: `https://admin.icoffio.com` (предположительно)

---

## 🔍 ДИАГНОСТИКА

### Код показывает (v7.13.0):

**app/api/admin/publish-article/route.ts:**
```typescript
const wpUrl = process.env.WORDPRESS_API_URL || 'https://icoffio.com';
//                                              ^^^^^^^^^^^^^^^^^^^^^^^^
//                                              СТАРЫЙ САЙТ (fallback)
```

### Что это значит:
1. Если `WORDPRESS_API_URL` **НЕ установлен** в Vercel → используется старый сайт
2. Если `WORDPRESS_API_URL` = `https://icoffio.com` в Vercel → тоже старый сайт

---

## ✅ РЕШЕНИЕ

### Шаг 1: Проверьте Vercel Environment Variables

**Откройте:**
https://vercel.com/dashboard → icoffio-front → Settings → Environment Variables

**Найдите:**
```
WORDPRESS_API_URL
```

**Должно быть:**
```
https://admin.icoffio.com
```
(или другой правильный URL для нового WordPress)

---

### Шаг 2: Если переменная неправильная - ИСПРАВЬТЕ

#### Вариант A: `admin.icoffio.com` существует ✅

Установите:
```
WORDPRESS_API_URL=https://admin.icoffio.com
```

#### Вариант B: WordPress на другом домене

Узнайте правильный URL и установите:
```
WORDPRESS_API_URL=https://YOUR_WORDPRESS_DOMAIN.com
```

#### Вариант C: WordPress = Next.js API Routes

Если WordPress не отдельный сервер, а встроен в app.icoffio.com:
```
WORDPRESS_API_URL=https://app.icoffio.com
```

---

### Шаг 3: Примените для всех окружений

**ВАЖНО:** Установите переменную для:
- ✅ Production
- ✅ Preview
- ✅ Development

---

### Шаг 4: Redeploy

После изменения переменной:
1. Vercel → Deployments → Latest → "Redeploy"
2. Или просто подождите 2-3 минуты (auto redeploy)

---

## 📋 ПРОВЕРКА

### Тест 1: Health Check

После deploy проверьте:
```bash
curl https://app.icoffio.com/api/articles?action=health-check
```

Ищите:
```json
{
  "wordpress": {
    "url": "https://admin.icoffio.com",  // ← ДОЛЖЕН БЫТЬ ПРАВИЛЬНЫЙ
    "status": "connected" // ← ДОЛЖЕН БЫТЬ connected
  }
}
```

### Тест 2: Отправьте задачу в Telegram

```
AI transforms education. Students learn faster.
```

Должно вернуть URL на **app.icoffio.com**:
```
✅ ОПУБЛИКОВАНО!
🇬🇧 EN: https://app.icoffio.com/en/article/ai-transforms-education-students-learn-faster
🇵🇱 PL: https://app.icoffio.com/pl/article/ai-transforms-education-students-learn-faster-pl
```

**НЕ** `icoffio.com/blog/...` ❌

---

## 🤔 ЕСЛИ НЕ УВЕРЕНЫ В ПРАВИЛЬНОМ URL

### Вопросы для выяснения:

1. **Где находится WordPress для app.icoffio.com?**
   - Отдельный сервер?
   - Встроен в Next.js?
   - Headless CMS?

2. **Есть ли admin.icoffio.com?**
   - Откройте в браузере: https://admin.icoffio.com
   - Проверьте: https://admin.icoffio.com/wp-json/wp/v2/posts

3. **Используется ли WordPress вообще?**
   - Или статьи хранятся только в Supabase?
   - Или используется другая CMS?

---

## 💡 БЫСТРОЕ РЕШЕНИЕ (Временное)

Если **не знаете правильный URL**, но хотите **прекратить публикацию на старый сайт**:

### Отключите WordPress публикацию:

**Vercel → Environment Variables:**
```
WORDPRESS_DISABLED=true
```

Это **временно отключит** публикацию на WordPress, пока не выясните правильный URL.

---

## 📊 ИСТОРИЯ

### Из памяти (ID: 9286776):
> "Unified API для icoffio полностью развернут на **app.icoffio.com**...  
> **WordPress интеграция** (настроена с admin доступом).  
> Админ панель доступна по **/en/admin**."

### Из ROLLBACK_v7.13.0.md:
```
WORDPRESS_API_URL=https://admin.icoffio.com
```

**Вывод:** Скорее всего правильный URL = `https://admin.icoffio.com`

---

## ✅ ACTION PLAN

1. **Откройте Vercel** → Environment Variables
2. **Проверьте `WORDPRESS_API_URL`**
3. **Установите:** `https://admin.icoffio.com` (или правильный URL)
4. **Примените для:** Production, Preview, Development
5. **Redeploy**
6. **Тестируйте:** отправьте задачу в Telegram
7. **Проверьте URL:** должен быть `app.icoffio.com`, не `icoffio.com`

---

**ЭТО КРИТИЧНО! Статьи сейчас идут НЕ на тот сайт!** 🚨

