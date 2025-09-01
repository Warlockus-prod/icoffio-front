# 🚀 Настройка переменных окружения в Vercel

> **Status:** ✅ TypeScript errors fixed in commit 09a5dfd

## OpenAI API Key Setup

### 1. Откройте Vercel Dashboard
- Перейдите на https://vercel.com/dashboard
- Найдите проект `icoffio-front` или `icoffio-clone-nextjs`
- Кликните на проект

### 2. Добавьте переменную окружения
1. В боковом меню выберите **"Settings"**
2. Кликните **"Environment Variables"**
3. Нажмите **"Add New"**
4. Заполните:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-ваш-ключ-здесь` (из OpenAI Platform)
   - **Environment:** выберите **Production**, **Preview**, **Development**

### 3. Redeploy проекта
1. Перейдите в **"Deployments"** 
2. Найдите последний деплой
3. Нажмите три точки → **"Redeploy"**
4. Или просто сделайте новый commit в Git

### 4. Проверка работы
После деплоя перейдите на:
- https://icoffio.com/api/translate - должен показать JSON с `"available": true`

## Другие полезные переменные

Можете также добавить:

```env
# Google Analytics (опционально)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# AdSense ID (для рекламы)  
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX

# Сайт URL
NEXT_PUBLIC_SITE_URL=https://icoffio.com
```

## 💡 Стоимость OpenAI API

- GPT-4o-mini: $0.15 за 1M входящих токенов
- Для типичного перевода статьи: ~$0.001-0.005
- Рекомендуем установить лимиты в OpenAI Dashboard

## 🔐 Безопасность

✅ **Правильно:**
- `OPENAI_API_KEY` - только серверная переменная
- Без префикса `NEXT_PUBLIC_`

❌ **Неправильно:**
- `NEXT_PUBLIC_OPENAI_API_KEY` - будет видна в браузере!
