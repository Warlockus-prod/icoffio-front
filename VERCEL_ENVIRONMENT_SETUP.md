# 🔐 VERCEL ENVIRONMENT VARIABLES SETUP

**Дата:** 23 октября 2025  
**Для проекта:** icoffio-front  
**Приоритет:** ВЫСОКИЙ  

---

## 📋 ПЕРЕМЕННЫЕ ДЛЯ ДОБАВЛЕНИЯ

### 1. OPENAI_API_KEY (AI генерация)
**Назначение:** Генерация статей, улучшение контента, переводы  
**Где используется:**
- `/api/generate-article`
- `/api/translate`
- `/api/articles` (AI mode)
- Admin панель → URL Parser → AI Generate

**Как получить:**
1. Зайти на https://platform.openai.com
2. API Keys → Create new secret key
3. Скопировать (показывается только один раз!)

**Формат:** `sk-proj-...` (начинается с sk-)

**Environments:** 
- ✅ Production
- ✅ Preview
- ✅ Development

---

### 2. UNSPLASH_ACCESS_KEY (Изображения)
**Назначение:** Поиск качественных изображений для статей  
**Где используется:**
- `/api/admin/images`
- Admin панель → Image System → Search

**Как получить:**
1. Зайти на https://unsplash.com/developers
2. Создать приложение (если нет)
3. Access Key скопировать

**Формат:** `abcd1234...` (строка из букв и цифр)

**Environments:**
- ✅ Production
- ✅ Preview
- ⚠️ Development (опционально)

---

### 3. NEXT_PUBLIC_SITE_URL (Canonical URL)
**Назначение:** SEO, canonical links, Open Graph  
**Где используется:**
- Metadata generation
- Sitemap
- Open Graph tags

**Значение:** `https://icoffio.com`

**Формат:** URL без слеша в конце

**Environments:**
- ✅ Production: `https://icoffio.com`
- ✅ Preview: `https://preview.icoffio.com` (или Vercel URL)
- ✅ Development: `http://localhost:3000`

---

### 4. NEXT_PUBLIC_WP_ENDPOINT (WordPress GraphQL)
**Назначение:** WordPress GraphQL endpoint  
**Где используется:**
- `lib/data.ts` - все GraphQL запросы
- Получение статей, категорий

**Значение:** `https://icoffio.com/graphql`

**Формат:** URL с /graphql на конце

**Environments:**
- ✅ Production: `https://icoffio.com/graphql`
- ✅ Preview: `https://icoffio.com/graphql` (или staging)
- ✅ Development: `https://icoffio.com/graphql`

---

### 5. N8N_WEBHOOK_SECRET (N8N интеграция)
**Назначение:** Безопасность N8N webhook  
**Где используется:**
- `/api/n8n-webhook`
- Telegram → N8N → icoffio workflow

**Как получить:**
1. Сгенерировать случайную строку (32+ символов)
2. Использовать в N8N workflow

**Формат:** Любая безопасная строка

**Пример генерации:**
```bash
openssl rand -hex 32
# Или
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Environments:**
- ✅ Production
- ✅ Preview (другой ключ для безопасности)
- ⚠️ Development (опционально)

---

### 6. WORDPRESS_URL (WordPress backend)
**Назначение:** Fallback, прямой доступ к WordPress  
**Где используется:**
- `/api/wordpress-articles`
- Backup endpoint

**Значение:** `https://icoffio.com`

**Формат:** URL без слеша в конце

**Environments:**
- ✅ Production: `https://icoffio.com`
- ✅ Preview: `https://icoffio.com` (или staging)
- ✅ Development: `https://icoffio.com`

---

## 🚀 КАК ДОБАВИТЬ В VERCEL

### Шаг 1: Открыть Vercel Dashboard

1. Зайти на https://vercel.com
2. Войти в аккаунт
3. Выбрать проект: **icoffio-front**

### Шаг 2: Перейти к Environment Variables

1. Клик на проект **icoffio-front**
2. **Settings** (в меню сверху)
3. **Environment Variables** (в боковом меню)

### Шаг 3: Добавить переменные

Для каждой переменной:

1. **Key:** Имя переменной (например: `OPENAI_API_KEY`)
2. **Value:** Значение (вставить ключ)
3. **Environments:** Выбрать (обычно все три: Production, Preview, Development)
4. Клик **Save**

### Шаг 4: Redeploy

После добавления ВСЕХ переменных:

1. **Deployments** (в меню)
2. Последний deployment → **... (три точки)** → **Redeploy**
3. Подтвердить

**Или через Git:**
```bash
git commit --allow-empty -m "🔧 Trigger redeploy for env variables"
git push origin main
```

---

## ✅ ПРОВЕРКА

### После redeploy проверить:

```bash
# 1. Проверка build logs в Vercel
# Убедиться что нет ошибок "environment variable not found"

# 2. API Health Check
curl -X POST https://app.icoffio.com/api/articles \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
  
# Должно вернуть: {"status":"ok", "version":"..."}

# 3. Admin панель
# Открыть: https://app.icoffio.com/en/admin
# Проверить что Image System работает (если есть UNSPLASH_ACCESS_KEY)
```

---

## 📊 ТАБЛИЦА ПЕРЕМЕННЫХ

| Variable | Required | Environments | Notes |
|----------|----------|--------------|-------|
| OPENAI_API_KEY | ⚠️ Optional | Prod, Preview | AI features |
| UNSPLASH_ACCESS_KEY | ⚠️ Optional | Prod, Preview | Image search |
| NEXT_PUBLIC_SITE_URL | ✅ Required | All | SEO critical |
| NEXT_PUBLIC_WP_ENDPOINT | ✅ Required | All | Default exists |
| N8N_WEBHOOK_SECRET | ⚠️ Optional | Prod, Preview | Security |
| WORDPRESS_URL | ⚠️ Optional | All | Fallback |

**Legend:**
- ✅ Required - обязательно для работы
- ⚠️ Optional - улучшает функциональность, но не критично

---

## 🔒 БЕЗОПАСНОСТЬ

### DO:
- ✅ Используйте разные ключи для Production и Preview
- ✅ Никогда не коммитьте ключи в Git
- ✅ Периодически ротируйте ключи (раз в 3-6 месяцев)
- ✅ Используйте .env.local для локальной разработки

### DON'T:
- ❌ НЕ публикуйте ключи в public repos
- ❌ НЕ используйте Production ключи для Development
- ❌ НЕ делитесь ключами через незащищенные каналы

---

## 📁 ЛОКАЛЬНАЯ РАЗРАБОТКА

### Создать .env.local (НЕ коммитить!)

```bash
# .env.local (добавить в .gitignore)
OPENAI_API_KEY=sk-proj-your-key-here
UNSPLASH_ACCESS_KEY=your-unsplash-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql
N8N_WEBHOOK_SECRET=your-local-secret
WORDPRESS_URL=https://icoffio.com
```

### .gitignore должен содержать:
```
.env
.env.local
.env*.local
```

---

## 🐛 TROUBLESHOOTING

### Проблема: "OpenAI API key не найден"
**Решение:**
1. Проверить что OPENAI_API_KEY добавлен в Vercel
2. Redeploy проект
3. Проверить build logs

### Проблема: "Unsplash images не загружаются"
**Решение:**
1. Проверить UNSPLASH_ACCESS_KEY
2. Проверить лимиты на Unsplash dashboard
3. Проверить что rate limit не превышен

### Проблема: "Canonical URL неправильный"
**Решение:**
1. Проверить NEXT_PUBLIC_SITE_URL
2. Убрать слеш в конце если есть
3. Redeploy

---

## 📝 CHECKLIST

Перед завершением:

- [ ] OPENAI_API_KEY добавлен
- [ ] UNSPLASH_ACCESS_KEY добавлен
- [ ] NEXT_PUBLIC_SITE_URL настроен
- [ ] NEXT_PUBLIC_WP_ENDPOINT проверен
- [ ] N8N_WEBHOOK_SECRET сгенерирован
- [ ] WORDPRESS_URL настроен
- [ ] Все переменные для Production
- [ ] Все переменные для Preview
- [ ] Development настроен (опционально)
- [ ] Redeploy выполнен
- [ ] API health check пройден
- [ ] Admin панель проверена
- [ ] .env.local создан локально
- [ ] .gitignore обновлен

---

## 🔄 СЛЕДУЮЩИЙ ШАГ

После добавления environment variables:
→ **Vercel Monitoring Setup** (см. VERCEL_MONITORING_SETUP.md)

---

**Создано:** 23 октября 2025  
**Обновлено:** 23 октября 2025  
**Статус:** Готово к использованию




