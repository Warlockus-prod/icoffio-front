# 🚀 N8N Integration Guide для icoffio

Полное руководство по настройке автоматизации публикации статей через n8n, телеграм бот и WordPress.

## 🎯 Что делает интеграция

1. **Получает статью** из телеграм бота
2. **Улучшает контент** через AI копирайтинг (OpenAI GPT-4)
3. **Переводит** на все поддерживаемые языки (en, pl, de, ro, cs)
4. **Генерирует изображения** через DALL-E или Unsplash
5. **Публикует** статьи на WordPress во всех языковых версиях

## 🔧 Настройка переменных окружения

Добавьте в ваш `.env.local`:

```env
# WordPress Configuration
WORDPRESS_API_URL=https://icoffio.com
WORDPRESS_USERNAME=your_wp_username
WORDPRESS_APP_PASSWORD=your_wp_application_password

# OpenAI Configuration
OPENAI_API_KEY=sk-...your_openai_key

# Unsplash Configuration (опционально)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# N8N Security (опционально)
N8N_WEBHOOK_SECRET=your_secret_key

# Site URLs
NEXT_PUBLIC_SITE_URL=https://icoffio.com
NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql
```

## 📋 Настройка WordPress

### 1. Создание Application Password

1. Войдите в WordPress как администратор
2. Перейдите в **Пользователи → Ваш профиль**
3. В разделе **Application Passwords** создайте новый пароль
4. Скопируйте сгенерированный пароль в `WORDPRESS_APP_PASSWORD`

### 2. Проверка REST API

Убедитесь, что WordPress REST API доступен:
```
https://icoffio.com/wp-json/wp/v2/posts
```

## 🤖 Настройка N8N Workflow

### 1. Webhook Node (Trigger)

```json
{
  "httpMethod": "POST",
  "path": "telegram-article",
  "responseMode": "responseNode",
  "options": {}
}
```

### 2. HTTP Request Node (к icoffio API)

**URL:** `https://icoffio.com/api/n8n-webhook`
**Method:** `POST`
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_N8N_WEBHOOK_SECRET"
}
```

**Body:**
```json
{
  "action": "process-article",
  "data": {
    "title": "{{ $json.message.text }}",
    "content": "{{ $json.message.text }}",
    "category": "tech",
    "language": "ru",
    "author": "AI Assistant",
    "chatId": "{{ $json.message.chat.id }}",
    "messageId": "{{ $json.message.message_id }}"
  }
}
```

### 3. Response Node

**Status Code:** `200`
**Body:**
```json
{
  "success": true,
  "message": "Article processing initiated",
  "articleId": "{{ $json.article.id }}",
  "urls": "{{ $json.urls }}"
}
```

## 📱 Настройка Telegram Bot

### 1. Создание бота

1. Найдите @BotFather в Telegram
2. Используйте `/newbot` для создания нового бота
3. Получите токен бота

### 2. Webhook для бота

```javascript
// Установка webhook для telegram бота
const TELEGRAM_TOKEN = 'your_bot_token';
const WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/telegram-article';

fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: WEBHOOK_URL })
});
```

## 🧪 Тестирование интеграции

### 1. Health Check

```bash
curl -X GET https://icoffio.com/api/n8n-webhook
```

**Ожидаемый ответ:**
```json
{
  "service": "N8N Integration Webhook",
  "version": "2.0.0",
  "services": {
    "translation": true,
    "copywriting": true,
    "imageGeneration": { "dalle": true, "unsplash": true },
    "wordpress": { "apiAvailable": true, "authenticated": true }
  }
}
```

### 2. Тестирование обработки статьи

```bash
curl -X POST https://icoffio.com/api/n8n-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{
    "action": "process-article",
    "data": {
      "title": "Тестовая статья об искусственном интеллекте",
      "content": "Искусственный интеллект развивается семимильными шагами...",
      "category": "ai"
    }
  }'
```

### 3. Проверка доступных категорий

```bash
curl -X POST https://icoffio.com/api/n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-categories"
  }'
```

## 📊 Структура ответа API

### Успешная обработка статьи:

```json
{
  "success": true,
  "article": {
    "id": "telegram-1640995200000-abc123def",
    "title": "Улучшенный заголовок статьи",
    "content": "Улучшенный контент...",
    "excerpt": "Краткое описание статьи...",
    "category": "ai",
    "image": "https://generated-image-url.com/image.jpg",
    "translations": {
      "en": { "title": "...", "content": "...", "excerpt": "..." },
      "pl": { "title": "...", "content": "...", "excerpt": "..." }
    }
  },
  "publicationResults": {
    "success": true,
    "publishedLanguages": ["ru", "en", "pl", "de", "ro", "cs"],
    "summary": { "published": 6, "failed": 0, "total": 6 }
  },
  "urls": {
    "en": "https://icoffio.com/en/article/improved-article-slug",
    "pl": "https://icoffio.com/pl/article/improved-article-slug"
  }
}
```

### Ошибка:

```json
{
  "success": false,
  "error": "Описание ошибки",
  "message": "Детальное сообщение об ошибке"
}
```

## 🔒 Безопасность

1. **Webhook Secret**: Используйте `N8N_WEBHOOK_SECRET` для защиты endpoint
2. **WordPress Auth**: Используйте Application Passwords, не основной пароль
3. **HTTPS**: Всегда используйте HTTPS для всех подключений
4. **Rate Limiting**: Настройте ограничения на WordPress и n8n

## 🚦 Поддерживаемые действия API

| Действие | Описание |
|----------|----------|
| `process-article` | Обработка и публикация статьи |
| `health-check` | Проверка состояния всех сервисов |
| `get-categories` | Получение доступных категорий |

## 🌍 Поддерживаемые языки

- `ru` - Русский (исходный)
- `en` - English
- `pl` - Polski
- `de` - Deutsch
- `ro` - Română
- `cs` - Čeština

## 📁 Поддерживаемые категории

- `ai` - Искусственный интеллект
- `apple` - Apple продукты
- `games` - Игры
- `tech` - Технологии

## 🔄 Workflow Example для N8N

```json
{
  "nodes": [
    {
      "name": "Telegram Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "telegram-article"
      }
    },
    {
      "name": "Process Article",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://icoffio.com/api/n8n-webhook",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer {{ $env.N8N_WEBHOOK_SECRET }}"
        },
        "body": {
          "action": "process-article",
          "data": {
            "title": "{{ $json.message.text }}",
            "content": "{{ $json.message.text }}",
            "category": "tech"
          }
        }
      }
    },
    {
      "name": "Send Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "{{ $json }}"
      }
    }
  ]
}
```

## 📞 Troubleshooting

### Проблема: WordPress API недоступен
**Решение:** Проверьте URL и убедитесь, что REST API включен

### Проблема: OpenAI API ошибки
**Решение:** Проверьте правильность API ключа и наличие средств на счете

### Проблема: Изображения не генерируются
**Решение:** Проверьте ключи OpenAI и Unsplash, или используйте placeholder изображения

### Проблема: Переводы не работают
**Решение:** Убедитесь, что OpenAI API ключ корректен и сервис перевода доступен

## 🎉 Готово!

После настройки всех компонентов:

1. Напишите боту в Telegram любой текст
2. Бот обработает статью через n8n
3. Статья будет улучшена, переведена и опубликована на всех языках
4. Вы получите ссылки на опубликованные статьи

---

*Создано для icoffio.com - технологический медиа портал* 🚀



