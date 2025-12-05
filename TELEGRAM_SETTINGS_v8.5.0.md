# 🤖 TELEGRAM BOT SETTINGS v8.5.0 - ИНСТРУКЦИИ

**Версия:** v8.5.0  
**Дата:** 2025-12-05  
**Статус:** ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ

---

## ✅ ЧТО СДЕЛАНО:

### Часть 1 - Admin Panel ✅
- [x] Миграция БД (telegram_user_preferences)
- [x] API endpoint (/api/telegram/settings)
- [x] React компонент (TelegramSettings.tsx)
- [x] Интеграция в админку (вкладка 🤖 Telegram)

### Часть 2 - Bot Integration ✅
- [x] Settings loader (загрузка настроек из БД)
- [x] Webhook integration (применение настроек)
- [x] Content processor (6 стилей обработки)
- [x] Publisher (auto-publish / draft)
- [x] Новая команда /settings

---

## 🚀 БЫСТРЫЙ СТАРТ

### ШАГ 1: Применить SQL миграцию в Supabase

1. Откройте Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz
   ```

2. Перейдите: **SQL Editor** → **New Query**

3. Скопируйте содержимое:
   ```
   supabase/migrations/20251205_telegram_settings.sql
   ```

4. Нажмите **Run** ✅

**Миграция добавит:**
- `content_style` VARCHAR(50) DEFAULT 'journalistic'
- `images_count` INTEGER DEFAULT 2
- `images_source` VARCHAR(20) DEFAULT 'unsplash'
- `auto_publish` BOOLEAN DEFAULT true

---

### ШАГ 2: Настроить в Admin Panel

1. Откройте админ панель:
   ```
   https://app.icoffio.com/en/admin
   ```

2. Перейдите на вкладку: **🤖 Telegram**

3. Настройте параметры:

   **📝 Content Style:**
   - 📰 Journalistic (по умолчанию) - engaging, wide audience
   - ✋ Keep As Is - минимальные изменения
   - 🔍 SEO Optimized - keywords & structure
   - 🎓 Academic - formal, scientific
   - 💬 Casual - friendly, conversational
   - ⚙️ Technical - detailed, precise

   **🖼️ Images:**
   - Количество: 0-3 (слайдер)
   - Источник: Unsplash / AI / None

   **🚀 Publishing:**
   - [x] Auto-publish - публиковать сразу
   - [ ] Save as Draft - сохранять как черновик

4. Нажмите: **💾 Save Settings**

5. Toast: "✅ Settings saved successfully!"

---

### ШАГ 3: Проверить настройки в Telegram

Откройте @icoffio_bot и отправьте:

```
/settings
```

**Ожидаемый ответ:**
```
⚙️ Ваши настройки публикации

📝 Стиль: 📰 Journalistic
🖼️ Картинок: 2
📸 Источник: Unsplash
✅ Публикация: Автоматически

💡 Изменить настройки:
🔗 app.icoffio.com/en/admin

Откройте админ панель → вкладка "🤖 Telegram"
```

---

## 🧪 ТЕСТИРОВАНИЕ

### ТЕСТ 1: Проверка настроек по умолчанию

**Отправьте текст:**
```
Meta announces breakthrough in AI research. New language model achieves human-level performance on complex reasoning tasks. The model uses advanced neural architecture and extensive training. Applications include scientific research, software development, and creative writing. Expected release in early 2025 with API access.
```

**Ожидаемый результат (~18 сек):**
```
✅ ОПУБЛИКОВАНО!

📝 Заголовок:
Meta Announces AI Breakthrough...

📊 Статистика:
• Стиль: 📰 Journalistic
• Слов: 450
• Категория: ai
• Время: 18s

🔗 Ссылки:
🇬🇧 EN: https://app.icoffio.com/en/article/...
🇵🇱 PL: https://app.icoffio.com/pl/article/...

✨ Статья опубликована на сайте (2 языка)!
🎨 Редактировать: app.icoffio.com/en/admin
```

**Проверьте:**
- [ ] EN статья: английский title + content ✅
- [ ] PL статья: польский title + content ✅
- [ ] Стиль Journalistic применен ✅
- [ ] Время < 30 секунд ✅

---

### ТЕСТ 2: Смена стиля на "Keep As Is"

1. Откройте админку → 🤖 Telegram
2. Выберите: **✋ Keep As Is**
3. Save Settings
4. Отправьте в @icoffio_bot тот же текст

**Ожидаемое поведение:**
- Текст НЕ должен сильно измениться
- Только grammar fixes и форматирование
- Сохранен авторский стиль

---

### ТЕСТ 3: Draft Mode

1. Админка → 🤖 Telegram
2. Снимите галочку: **Auto-publish**
3. Save Settings
4. Отправьте текст в бот

**Ожидаемый результат:**
```
📝 СОХРАНЕНО КАК ЧЕРНОВИК!

📝 Заголовок:
...

📊 Статистика:
• Стиль: ...
• Слов: ...
• Время: 18s

🔗 Ссылки:
🇬🇧 EN: ...
🇵🇱 PL: ...

💡 Черновик сохранен. Опубликуйте через админ панель.
🎨 Редактировать: app.icoffio.com/en/admin
```

**Проверьте:**
- [ ] Статья НЕ видна на сайте ❌
- [ ] В админке: status = draft 📝
- [ ] Можно опубликовать вручную ✅

---

### ТЕСТ 4: SEO Optimized Style

1. Админка → выберите **🔍 SEO Optimized**
2. Save
3. Отправьте текст про конкретную технологию

**Ожидаемое поведение:**
- Больше ключевых слов
- Структурированные заголовки
- SEO-friendly формулировки

---

## 📊 ПРОВЕРОЧНЫЙ ЛИСТ

### Admin Panel:
- [ ] Вкладка 🤖 Telegram доступна
- [ ] Можно выбрать Content Style (6 вариантов)
- [ ] Slider для Images Count (0-3)
- [ ] Radio для Images Source
- [ ] Checkbox для Auto-publish
- [ ] Save Settings работает
- [ ] Toast уведомление показывается

### Telegram Bot:
- [ ] /start - показывает v8.5
- [ ] /help - обновленная справка
- [ ] /settings - показывает текущие настройки
- [ ] Обработка текста применяет contentStyle
- [ ] Dual-language работает (EN + PL)
- [ ] AutoPublish работает
- [ ] Draft mode работает

### Database:
- [ ] Новые колонки в telegram_user_preferences
- [ ] Settings сохраняются в БД
- [ ] Default settings работают
- [ ] Upsert работает (update/insert)

---

## 🔍 МОНИТОРИНГ

### Vercel Logs:
```
https://vercel.com/dashboard
```

**Ищите:**
- `[SettingsLoader] Loading settings for chat X`
- `[SettingsLoader] ✅ Loaded settings: {...}`
- `[TelegramSimple] ⚙️ Settings: {...}`
- `[TelegramSimple] 🤖 Processing with AI (..., style: X)`

### Supabase:
```
SELECT chat_id, content_style, images_count, images_source, auto_publish 
FROM telegram_user_preferences 
WHERE chat_id = YOUR_CHAT_ID;
```

---

## 📝 ДОСТУПНЫЕ СТИЛИ

### 📰 Journalistic (Default)
**Подходит для:** Новости, технические обзоры  
**Характеристики:** Engaging, clear, wide audience  
**Пример:** "Meta unveils groundbreaking AI model..."

### ✋ Keep As Is
**Подходит для:** Уже готовые тексты  
**Характеристики:** Minimal changes, preserve voice  
**Пример:** (почти оригинальный текст)

### 🔍 SEO Optimized
**Подходит для:** Статьи для поиска  
**Характеристики:** Keywords, structure, visibility  
**Пример:** "Best AI Tools 2025: Complete Guide..."

### 🎓 Academic
**Подходит для:** Научные статьи  
**Характеристики:** Formal, precise, scholarly  
**Пример:** "An Analysis of Neural Network Architectures..."

### 💬 Casual
**Подходит для:** Блоги, личные статьи  
**Характеристики:** Friendly, simple, approachable  
**Пример:** "Hey! Check out this cool AI thing..."

### ⚙️ Technical
**Подходит для:** Технические гайды  
**Характеристики:** Detailed, precise, comprehensive  
**Пример:** "Implementation of Transformer Architecture..."

---

## 🎯 РЕКОМЕНДУЕМЫЕ НАСТРОЙКИ

### Для новостей:
- Style: 📰 Journalistic
- Images: 2
- Source: Unsplash
- Auto-publish: ✅

### Для техгайдов:
- Style: ⚙️ Technical
- Images: 2-3
- Source: Unsplash
- Auto-publish: ✅

### Для проверки контента:
- Style: ✋ Keep As Is
- Images: 0-1
- Source: любой
- Auto-publish: ❌ (Draft)

---

## 🚀 ГОТОВО К ИСПОЛЬЗОВАНИЮ!

**Применили SQL миграцию?** → Откройте админку  
**Настроили параметры?** → Отправьте текст в @icoffio_bot  
**Получили статью?** → Проверьте EN + PL версии!

🎉 **SYSTEM FULLY OPERATIONAL!**

