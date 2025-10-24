# 🔑 НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

## 📋 Обзор

Для полной функциональности системы API добавления статей icoffio необходимо настроить переменные окружения. Создайте файл `.env.local` в корне проекта со следующими переменными:

## 🚀 ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ

### 1. OpenAI API (КРИТИЧНО)

```env
# OpenAI API Key - для копирайтинга, переводов и DALL-E изображений
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Как получить:**
1. Перейдите на https://platform.openai.com/api-keys
2. Войдите в аккаунт OpenAI
3. Создайте новый API ключ
4. Скопируйте ключ (начинается с `sk-`)

**Стоимость:** ~$1-5 в месяц при умеренном использовании

### 2. WordPress API (ВАЖНО)

```env
# WordPress REST API настройки
WORDPRESS_API_URL=https://icoffio.com
WORDPRESS_USERNAME=your-wp-username
WORDPRESS_APP_PASSWORD=your-app-password
```

**Как настроить:**
1. Войдите в WordPress как администратор
2. Перейдите в **Пользователи → Ваш профиль**
3. В разделе **Application Passwords** введите имя (например, "icoffio-api")
4. Нажмите **Add New Application Password**
5. Скопируйте сгенерированный пароль (НЕ основной пароль!)

## 🎨 ДОПОЛНИТЕЛЬНЫЕ ПЕРЕМЕННЫЕ

### 3. Unsplash (для изображений)

```env
# Unsplash Access Key - для получения изображений к статьям
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
```

**Как получить:**
1. Зарегистрируйтесь на https://unsplash.com/developers
2. Создайте новое приложение
3. Скопируйте Access Key

### 4. N8N + Telegram интеграция

```env
# N8N Webhook Secret - для защиты API endpoints
N8N_WEBHOOK_SECRET=your-secure-secret-key-123

# Telegram Bot Token (если нужен)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 5. Общие настройки

```env
# Основной URL сайта
NEXT_PUBLIC_SITE_URL=https://icoffio.com

# WordPress GraphQL (если используется)
NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql

# Пароль админ панели
NEXT_PUBLIC_ADMIN_PASSWORD=icoffio2025

# Режим разработки
NODE_ENV=development
DEBUG=false
VERBOSE_LOGGING=true
```

## 📁 Пример полного .env.local

Создайте файл `.env.local` в корне проекта:

```env
# ========== AI & CONTENT SERVICES ==========
OPENAI_API_KEY=sk-proj-1234567890abcdef...

# ========== WORDPRESS INTEGRATION ==========
WORDPRESS_API_URL=https://icoffio.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=abcd 1234 efgh 5678

# ========== N8N & TELEGRAM ==========
N8N_WEBHOOK_SECRET=my-super-secure-secret-2024

# ========== SITE CONFIGURATION ==========
NEXT_PUBLIC_SITE_URL=https://icoffio.com
NEXT_PUBLIC_ADMIN_PASSWORD=icoffio2025

# ========== OPTIONAL ==========
UNSPLASH_ACCESS_KEY=your-unsplash-key
NODE_ENV=development
```

## 🧪 ПРОВЕРКА НАСТРОЕК

После настройки переменных выполните:

### 1. Health Check

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{"action": "health-check"}' | jq
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "services": {
    "translation": true,    // ✅ если OpenAI ключ настроен
    "copywriting": true,    // ✅ если OpenAI ключ настроен  
    "images": true,         // ✅ если Unsplash ключ настроен
    "wordpress": true,      // ✅ если WordPress настроен
    "urlParser": true       // ✅ всегда true
  }
}
```

### 2. Тест URL парсера

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-from-url",
    "url": "https://habr.com/ru/articles/123456/",
    "category": "tech"
  }' | jq
```

### 3. Тест админ панели

Откройте: `http://localhost:3000/ru/admin`
- Введите пароль: `icoffio2025`
- Попробуйте создать статью из URL

## 🚨 ВАЖНЫЕ ЗАМЕЧАНИЯ

### ⚠️ Безопасность

1. **НИКОГДА** не коммитьте `.env.local` в git
2. Используйте **Application Password** для WordPress, НЕ основной пароль
3. Регенерируйте N8N_WEBHOOK_SECRET при продакшн деплое

### 💰 Расходы

- **OpenAI API**: $1-10/месяц при умеренном использовании
- **Unsplash**: Бесплатно до 50 изображений/час
- **WordPress**: Бесплатно (собственный сайт)

### 🔧 Настройка в продакшн

Для развертывания на Vercel:
1. Откройте Vercel Dashboard
2. Перейдите в **Settings → Environment Variables**
3. Добавьте все переменные из `.env.local`

## 📞 Troubleshooting

### Проблема: "OpenAI API ключ не найден"
**Решение:** Проверьте правильность `OPENAI_API_KEY` и перезапустите сервер

### Проблема: "WordPress API недоступен"
**Решение:** Убедитесь, что WordPress REST API включен: `https://icoffio.com/wp-json/wp/v2/posts`

### Проблема: "Переводы не работают"
**Решение:** Проверьте баланс на счете OpenAI и правильность API ключа

### Проблема: "Изображения не генерируются"
**Решение:** Добавьте `UNSPLASH_ACCESS_KEY` или проверьте лимиты Unsplash

---

## ✅ ЧЕКЛИСТ НАСТРОЙКИ

- [ ] Создал файл `.env.local`
- [ ] Добавил `OPENAI_API_KEY`
- [ ] Настроил WordPress переменные
- [ ] Установил `N8N_WEBHOOK_SECRET`
- [ ] (Опционально) Добавил `UNSPLASH_ACCESS_KEY`
- [ ] Проверил health check
- [ ] Протестировал создание статьи из URL
- [ ] Протестировал админ панель

**🎉 После выполнения всех пунктов система готова к использованию!**





