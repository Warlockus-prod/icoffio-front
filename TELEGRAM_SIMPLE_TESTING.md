# 🧪 TELEGRAM SIMPLE BOT - TESTING GUIDE

**Версия:** v8.0.0  
**Дата:** 2026-02-15  
**Статус:** ✅ READY FOR TESTING

---

## ✅ СИСТЕМА ГОТОВА!

### 🔧 Что сделано:

1. ✅ **Создана упрощенная система** (300 строк кода)
2. ✅ **Все файлы без ошибок** (TypeScript 0 errors)
3. ✅ **Docker deploy успешен на VPS#2** (v8.0.0; Vercel hosting deprecated in v10.8.0)
4. ✅ **Webhook настроен** (`/api/telegram-simple/webhook`)
5. ✅ **Pending updates: 0** (нет застрявших сообщений)

---

## 📱 КАК ТЕСТИРОВАТЬ

### Telegram Bot: **@icoffio_bot**

### 1️⃣ ТЕСТ КОМАНД

Откройте бот и отправьте:

```
/start
```

**Ожидаемый результат:**
```
🤖 Привет! Я icoffio Bot (Simple)

📝 Что я умею:
• Создавать статьи из текста
• Парсить статьи по URL

💡 Просто отправь:
• URL статьи для парсинга
• Текст (минимум 100 символов)

⚡ Обработка: ~10-15 секунд
🚀 Начни прямо сейчас!
```

---

### 2️⃣ ТЕСТ С ТЕКСТОМ

Отправьте текст (минимум 100 символов):

```
Artificial intelligence is transforming the healthcare industry in unprecedented ways. Machine learning algorithms are now capable of analyzing medical images with accuracy that rivals human experts. Deep learning models can detect diseases like cancer at early stages, potentially saving millions of lives. Natural language processing helps doctors extract insights from vast amounts of medical literature. AI-powered diagnostic tools are becoming more accessible, bringing high-quality healthcare to underserved communities worldwide.
```

**Ожидаемый процесс:**
1. ⏳ "Обрабатываю... (~10-15 сек)"
2. 🤖 AI улучшает текст (10-15 сек)
3. 📤 Публикация в Supabase (1-2 сек)
4. ✅ "ОПУБЛИКОВАНО!" + ссылка

**Пример ответа:**
```
✅ ОПУБЛИКОВАНО!

📝 Заголовок:
AI Revolutionizes Healthcare: Machine Learning Saves Lives

📊 Статистика:
• Слов: 523
• Категория: ai
• Время: 12s

🔗 Ссылка:
https://app.icoffio.com/en/article/ai-revolutionizes-healthcare-en

✨ Статья опубликована и доступна на сайте!
🎨 Можно отредактировать в админке: app.icoffio.com/en/admin
```

---

### 3️⃣ ТЕСТ С URL

Отправьте URL статьи (любой новостной сайт):

```
https://techcrunch.com/2024/01/15/openai-announces-gpt-5/
```

**Ожидаемый процесс:**
1. ⏳ "Обрабатываю... 🔗 Парсю URL"
2. 🔗 Парсинг контента (2-3 сек)
3. 🤖 AI улучшает (10-15 сек)
4. 📤 Публикация (1-2 сек)
5. ✅ Уведомление с ссылкой

---

## 📊 ОЖИДАЕМЫЕ МЕТРИКИ

| Метрика | Старая система | Новая система ✅ |
|---------|----------------|------------------|
| **Время обработки** | 35-90 сек | 10-20 сек |
| **Success rate** | 60-70% | 95%+ |
| **AI вызовов** | 4 | 1 |
| **Сложность кода** | 2000+ строк | 300 строк |
| **Timeout errors** | Часто | Редко |

---

## 🐛 ЧТО ПРОВЕРИТЬ

### ✅ Базовый функционал:
- [ ] `/start` работает
- [ ] `/help` работает
- [ ] Короткий текст отклоняется (< 100 символов)
- [ ] Текст 100+ символов обрабатывается
- [ ] URL парсится и обрабатывается
- [ ] Уведомление приходит
- [ ] Ссылка работает (статья видна на сайте)

### ✅ Производительность:
- [ ] Текст: 10-20 секунд
- [ ] URL: 10-20 секунд
- [ ] Нет timeout errors
- [ ] Бот не застревает

### ✅ Качество контента:
- [ ] Title осмысленный
- [ ] Content структурирован (заголовки)
- [ ] Excerpt короткий и точный
- [ ] Category определена правильно
- [ ] Word count корректный

---

## 🔍 МОНИТОРИНГ

### Container logs (VPS#2):
```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 root@178.104.223.93 \
  'docker logs --tail 200 icoffio-front-app 2>&1 | grep TelegramSimple'
```

**Ищите:**
- `[TelegramSimple] 📨 Webhook called` - webhook получен
- `[TelegramSimple] 💬 From chat X` - сообщение обрабатывается
- `[TelegramSimple] 🤖 Processing with AI` - AI работает
- `[TelegramSimple] 📤 Publishing` - публикация
- `[TelegramSimple] ✅ SUCCESS` - готово
- `[TelegramSimple] ❌ ERROR` - ошибка

### Supabase:
```
https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz
```

**Проверьте:**
- `published_articles` - новые статьи появляются
- `source = 'telegram-simple'` - отличие от старой системы

---

## ❌ ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### 1. Бот не отвечает:
```bash
# Проверить webhook
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

**Должно быть:**
- `"url": "https://app.icoffio.com/api/telegram-simple/webhook"`
- `"pending_update_count": 0`
- Нет `last_error_message`

### 2. Ошибка "Processing failed":
- Проверьте container logs (см. выше команду)
- Проверьте что OpenAI API key настроен
- Проверьте PostgreSQL credentials в .env.production на VPS#2

### 3. URL не парсится:
- Убедитесь что URL доступен
- Попробуйте другой URL
- Проверьте логи: какая ошибка?

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ (если всё работает)

### Фаза 2 (опционально):
- [ ] Добавить dual-language (EN + PL)
- [ ] Добавить картинки из Unsplash
- [ ] Добавить AI категорию
- [ ] Админ-панель интеграция

### Фаза 3 (опционально):
- [ ] Queue система для больших нагрузок
- [ ] Retry механизм
- [ ] Analytics трекинг
- [ ] Rate limiting для пользователей

---

## 📝 ОТЧЕТ О ТЕСТИРОВАНИИ

После тестирования заполните:

```
ТЕСТ 1 - КОМАНДЫ:
/start: [ ] ✅ / [ ] ❌
/help:  [ ] ✅ / [ ] ❌

ТЕСТ 2 - ТЕКСТ:
Отправлен: ____________________
Время: ____ сек
Результат: [ ] ✅ / [ ] ❌
Ссылка: ____________________

ТЕСТ 3 - URL:
URL: ____________________
Время: ____ сек
Результат: [ ] ✅ / [ ] ❌
Ссылка: ____________________

ОБЩИЕ ВПЕЧАТЛЕНИЯ:
Скорость: [ ] Отлично [ ] Хорошо [ ] Медленно
Надежность: [ ] Отлично [ ] Хорошо [ ] Плохо
Качество контента: [ ] Отлично [ ] Хорошо [ ] Плохо

ПРОБЛЕМЫ (если есть):
____________________
____________________
```

---

## 🎉 ГОТОВО К ТЕСТИРОВАНИЮ!

**Откройте @icoffio_bot и начните тестирование!** 🚀

Удачи! 🍀

