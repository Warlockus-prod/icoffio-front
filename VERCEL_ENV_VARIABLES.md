# 🔑 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ДЛЯ VERCEL

## Скопируйте эти переменные в настройки Vercel:

### Environment Variables (Settings → Environment Variables):

```
NEXT_PUBLIC_SITE_URL = https://ВАШ-ДОМЕН.vercel.app
NEXT_PUBLIC_WP_ENDPOINT = https://icoffio.com/graphql  
REVALIDATE_TOKEN = prod_secure_token_123
TELEGRAM_BOT_TOKEN = 8323638388:AAHlWl2FF2U4TG5phVA45cVO0rnzu2_os1c
TELEGRAM_WEBHOOK_URL = https://ВАШ-ДОМЕН.vercel.app/api/telegram
```

## 🔧 ПОШАГОВАЯ НАСТРОЙКА:

1. **В Vercel Dashboard** → **ваш проект** → **Settings** → **Environment Variables**
2. **Добавьте каждую переменную:**
   - Key: `NEXT_PUBLIC_SITE_URL`
   - Value: `https://ВАШ-ДОМЕН.vercel.app` (появится после деплоя)
   - Environment: **Production, Preview, Development**

3. **Повторите для всех переменных**

## ⚡ ВАЖНО:
- `NEXT_PUBLIC_SITE_URL` - обновите после получения домена от Vercel
- `REVALIDATE_TOKEN` - поменяйте на более безопасный для продакшена
- Все остальные переменные - копируйте как есть

## 🎯 РЕЗУЛЬТАТ:
После добавления переменных нажмите **"Redeploy"** в Vercel для применения настроек.
