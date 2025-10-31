# 🎯 ПЛАН УЛУЧШЕНИЙ TELEGRAM БОТА v7.13.0

**Дата:** 31 октября 2025  
**Текущая версия:** v7.12.2  
**Целевая версия:** v7.13.0  
**Статус:** Planning

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### ✅ Что УЖЕ РАБОТАЕТ:

1. **Compose Mode** (v7.5.0)
   - ✅ `/compose` - режим составления
   - ✅ `/publish` - публикация накопленного
   - ✅ `/cancel` - отмена
   - ✅ Inline кнопки
   - ✅ Auto-cleanup (15 минут)
   - ✅ Multi-language (RU, PL, EN)

2. **Queue System** (v7.12.0-v7.12.2)
   - ✅ Supabase persistent storage
   - ✅ Timeout protection (180 секунд)
   - ✅ Dual language URLs в уведомлениях
   - ✅ Enhanced logging

3. **Delete Command** (v7.5.0)
   - ✅ `/delete` - удаление статей по URL

### ⚠️ Не критичные ошибки:

```
[Supabase Analytics] Failed to get popular articles
```
- **Причина:** Materialized view `article_popularity` не создан
- **Влияние:** Только аналитика
- **Приоритет:** Низкий

---

## 🎯 ПЛАНИРУЕМЫЕ УЛУЧШЕНИЯ

### A) 🎨 Стиль публикации

#### Проблема:
Все статьи публикуются в одном стандартном стиле. Нужно дать возможность выбора:
- Новостной стиль (короткий, факты)
- Аналитический стиль (длинный, подробный)
- Tutorial стиль (шаг за шагом)
- Opinion стиль (личное мнение)

#### Решение:

**1. Добавить команду `/style`:**
```
/style

🎨 Выберите стиль публикации:

📰 Новостной - краткие факты, 300-500 слов
📊 Аналитический - глубокий анализ, 800-1200 слов  
📚 Tutorial - пошаговый гайд, 600-900 слов
💭 Opinion - личное мнение, 500-700 слов

Текущий стиль: Аналитический ✅
```

**2. Сохранить настройку стиля:**
```typescript
// lib/telegram-user-preferences.ts
interface UserPreferences {
  chatId: number;
  style: 'news' | 'analytical' | 'tutorial' | 'opinion';
  language: string;
  theme?: string;
}
```

**3. Передавать стиль в AI prompt:**
```typescript
// lib/dual-language-publisher.ts
const style = getUserStyle(chatId) || 'analytical';

const stylePrompts = {
  news: "Write a concise news article with facts...",
  analytical: "Write an in-depth analytical article...",
  tutorial: "Write a step-by-step tutorial...",
  opinion: "Write an opinion piece..."
};

const prompt = `${stylePrompts[style]}\n\n${content}`;
```

**Файлы для изменения:**
- `lib/telegram-user-preferences.ts` (новый)
- `lib/dual-language-publisher.ts` (обновить)
- `lib/telegram-i18n.ts` (добавить переводы)
- `app/api/telegram/webhook/route.ts` (добавить обработку `/style`)

**Время:** 2-3 часа  
**Риск:** Низкий (не трогает существующую логику)

---

### B) 🖼️ Унифицированные изображения

#### Проблема:
Разные статьи получают разные изображения, даже если тема похожая. Нужна библиотека переиспользуемых изображений.

#### Решение:

**1. Image Library в Supabase:**
```sql
-- supabase/migrations/telegram_image_library.sql
CREATE TABLE telegram_image_library (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  category VARCHAR(50),
  keywords TEXT[], -- Array of keywords
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_image_keywords ON telegram_image_library USING GIN(keywords);
CREATE INDEX idx_image_category ON telegram_image_library(category);
```

**2. Smart Image Reuse:**
```typescript
// lib/telegram-image-service.ts
export async function getOrGenerateImage(
  title: string,
  category: string,
  keywords: string[]
): Promise<string> {
  // 1. Try to find existing image
  const existing = await findSimilarImage(keywords, category);
  if (existing) {
    await incrementUsageCount(existing.id);
    return existing.image_url;
  }

  // 2. Generate new image
  const newImage = await generateImage(title);
  
  // 3. Save to library
  await saveToLibrary({
    image_url: newImage,
    prompt: title,
    category,
    keywords
  });

  return newImage;
}
```

**3. Админка для управления:**
```typescript
// components/admin/ImageLibrary.tsx
- Browse всех сохраненных изображений
- Search по keywords
- Статистика использования
- Удаление неиспользуемых
```

**Файлы для создания:**
- `supabase/migrations/telegram_image_library.sql` (новый)
- `lib/telegram-image-service.ts` (новый)
- `components/admin/ImageLibrary.tsx` (новый, optional)

**Файлы для обновления:**
- `lib/dual-language-publisher.ts` (использовать новый сервис)

**Время:** 3-4 часа  
**Риск:** Средний (новая таблица в Supabase)

---

### C) 📊 Фикс Supabase Analytics

#### Проблема:
```
[Supabase Analytics] Failed to get popular articles
```

#### Решение:

**1. Создать materialized view:**
```sql
-- supabase/migrations/article_popularity.sql
CREATE MATERIALIZED VIEW article_popularity AS
SELECT 
  article_slug,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_ip) as unique_views,
  MAX(viewed_at) as last_viewed,
  (COUNT(*) * 0.7 + 
   EXTRACT(EPOCH FROM (NOW() - MAX(viewed_at))) / 86400 * -0.3) as popularity_score
FROM article_views
GROUP BY article_slug
ORDER BY popularity_score DESC;

CREATE UNIQUE INDEX idx_popularity_slug ON article_popularity(article_slug);
```

**2. Auto-refresh функция:**
```sql
CREATE OR REPLACE FUNCTION refresh_article_popularity()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY article_popularity;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (pg_cron extension)
SELECT cron.schedule(
  'refresh-popularity',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT refresh_article_popularity()'
);
```

**Файлы:**
- `supabase/migrations/article_popularity.sql` (новый)

**Время:** 30 минут  
**Риск:** Низкий (только аналитика)

---

## 🛠️ ПОШАГОВЫЙ ПЛАН РЕАЛИЗАЦИИ (БЕЗ ПОЛОМКИ)

### STEP 1: Подготовка (30 минут)

1. ✅ Создать feature branch
```bash
git checkout -b feature/telegram-improvements-v7.13.0
```

2. ✅ Создать backup
```bash
./scripts/create-backup.sh
```

3. ✅ Прочитать существующий код:
   - `lib/dual-language-publisher.ts`
   - `app/api/telegram/webhook/route.ts`
   - `lib/telegram-compose-state.ts`

### STEP 2: Стиль публикации (2-3 часа)

**2.1. Создать UserPreferences (30 мин)**
```bash
# Создать файл
touch lib/telegram-user-preferences.ts

# Структура:
- interface UserPreferences
- Map для in-memory хранения
- функции: setStyle(), getStyle(), setLanguage()
```

**2.2. Добавить `/style` команду (1 час)**
```typescript
// app/api/telegram/webhook/route.ts
case '/style':
  await handleStyleCommand(chatId);
  break;
```

**2.3. Обновить AI prompts (1 час)**
```typescript
// lib/dual-language-publisher.ts
const userStyle = getUserStyle(chatId);
const prompt = getStylePrompt(userStyle, content);
```

**2.4. Тестирование (30 мин)**
```
/style → выбрать Новостной
Отправить текст → проверить стиль
```

### STEP 3: Image Library (3-4 часа)

**3.1. SQL миграция (30 мин)**
```sql
-- Создать таблицу
CREATE TABLE telegram_image_library...
```

**3.2. Image Service (2 часа)**
```typescript
// lib/telegram-image-service.ts
- findSimilarImage()
- saveToLibrary()
- incrementUsageCount()
```

**3.3. Интеграция (1 час)**
```typescript
// lib/dual-language-publisher.ts
const imageUrl = await getOrGenerateImage(title, category, keywords);
```

**3.4. Тестирование (30 мин)**
```
Отправить 2 статьи с похожей темой
Проверить что второя переиспользует изображение
```

### STEP 4: Analytics Fix (30 мин)

**4.1. Создать materialized view**
```sql
CREATE MATERIALIZED VIEW article_popularity...
```

**4.2. Проверить логи**
```
Должно исчезнуть: [Supabase Analytics] Failed...
```

### STEP 5: Testing & Deploy (1 час)

**5.1. TypeScript check**
```bash
npx tsc --noEmit
```

**5.2. Build test**
```bash
npm run build
```

**5.3. Локальное тестирование**
```bash
npm run dev
# Тестировать все команды
```

**5.4. Deploy**
```bash
git add .
git commit -m "✨ Feature: v7.13.0 - Стиль публикации + Image Library"
git push origin feature/telegram-improvements-v7.13.0
# Создать PR
# После review → merge в main
```

---

## 📊 ОЦЕНКА ВРЕМЕНИ

| Задача | Время | Риск |
|--------|-------|------|
| Подготовка | 30 мин | Нет |
| Стиль публикации | 2-3 часа | Низкий |
| Image Library | 3-4 часа | Средний |
| Analytics Fix | 30 мин | Низкий |
| Testing & Deploy | 1 час | Низкий |
| **ИТОГО** | **7-9 часов** | **Низкий-Средний** |

**Распределение:**
- День 1 (4 часа): Подготовка + Стиль публикации
- День 2 (4 часа): Image Library + Analytics Fix
- День 3 (1 час): Testing & Deploy

---

## ⚠️ РИСКИ И МИТИГАЦИЯ

### Риск 1: Image Library сломает существующую генерацию

**Митигация:**
- Добавить feature flag
```typescript
const USE_IMAGE_LIBRARY = process.env.USE_IMAGE_LIBRARY === 'true';

if (USE_IMAGE_LIBRARY) {
  return await getOrGenerateImage(...);
} else {
  return await generateImage(...); // OLD WAY
}
```

### Риск 2: Стили не будут работать с польским языком

**Митигация:**
- Создать style prompts для каждого языка
```typescript
const stylePrompts = {
  en: { news: "...", analytical: "..." },
  pl: { news: "...", analytical: "..." },
  ru: { news: "...", analytical: "..." }
};
```

### Риск 3: Supabase migration сломает существующие таблицы

**Митигация:**
- Использовать `IF NOT EXISTS`
- Тестировать на локальной Supabase сначала
- Иметь rollback plan

---

## 🎯 SUCCESS CRITERIA

### Обязательно:
- ✅ `/style` команда работает
- ✅ Стили применяются корректно
- ✅ Image Library сохраняет изображения
- ✅ Переиспользование изображений работает
- ✅ Analytics ошибка исчезла
- ✅ TypeScript 0 errors
- ✅ Build successful
- ✅ Все существующие команды работают

### Опционально:
- ⭐ Админка для Image Library
- ⭐ Статистика по стилям
- ⭐ A/B тестирование стилей

---

## 📚 ДОКУМЕНТАЦИЯ

После завершения обновить:
1. `CHANGELOG.md` - добавить v7.13.0
2. `docs/TELEGRAM_BOT_SETUP_GUIDE.md` - новые команды
3. `README.md` - обновить features list

---

**Готов начать?** Следуй плану пошагово и делай коммиты после каждого шага!


