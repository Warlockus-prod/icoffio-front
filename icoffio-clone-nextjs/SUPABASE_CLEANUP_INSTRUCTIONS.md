# 📋 ИНСТРУКЦИЯ: ПУБЛИКАЦИЯ И ОЧИСТКА В SUPABASE

**Цель:** Опубликовать хорошие статьи + удалить тестовые

---

## 🚀 **КАК ВЫПОЛНИТЬ:**

### **Вариант 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)**

1. **Зайти в Supabase:**
   - URL: https://supabase.com/dashboard
   - Выбрать проект **icoffio**

2. **Открыть SQL Editor:**
   - В левом меню: **SQL Editor**
   - Нажать **"New Query"**

3. **Скопировать SQL:**
   ```sql
   -- ПУБЛИКАЦИЯ ХОРОШИХ СТАТЕЙ
   UPDATE published_articles 
   SET published = true, updated_at = NOW()
   WHERE slug_en IN (
     'techcrunch-startup-and-technology-news-en',
     'how-to-run-any-pc-game-on-android-a-review-of-the-gamehub-em-en',
     'openai-news'
   ) OR slug_pl IN (
     'techcrunch-startup-and-technology-news-pl',
     'kak-zapustit-lyubuyu-igru-s-pk-na-android-obzor-emulyatora-g-pl',
     'openai-news'
   );
   
   -- УДАЛЕНИЕ ТЕСТОВЫХ СТАТЕЙ
   DELETE FROM published_articles
   WHERE slug_en IN (
     'revolutionary-breakthrough-in-quantum-computing-te-en',
     'ai-revolution-2025-en',
     'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimat-en'
   ) OR slug_pl IN (
     'revolutionary-breakthrough-in-quantum-computing-te-pl',
     'ai-revolution-2025-pl',
     'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimat-pl'
   );
   ```

4. **Запустить (RUN):**
   - Нажать **"Run"** или **Ctrl+Enter**
   - Должно показать: **"Success. X rows affected"**

5. **Проверить результат:**
   ```sql
   SELECT id, title, slug_en, slug_pl, published, created_at
   FROM published_articles
   ORDER BY created_at DESC;
   ```

---

### **Вариант 2: Через Table Editor**

1. **Зайти в Supabase Dashboard**
2. **Table Editor** → **published_articles**
3. **Найти статьи** (по slug):
   - `techcrunch-startup-and-technology-news-en`
   - `how-to-run-any-pc-game-on-android-a-review-of-the-gamehub-em-en`
   - `openai-news`
4. **Для каждой статьи:**
   - Кликнуть на строку
   - Изменить **published** с `false` на `true`
   - Save
5. **Удалить тестовые:**
   - Найти по slug (Revolutionary, AI Revolution 2025, iPhone 16)
   - Delete row

---

## 📊 **ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:**

### После выполнения SQL:

**В Supabase:**
- ✅ **5 статей published = true:**
  - TechCrunch (EN)
  - TechCrunch (PL)
  - Wylsa GameHub (EN)
  - Wylsa GameHub (PL)
  - OpenAI News
- ❌ **6 статей УДАЛЕНО:**
  - Revolutionary Breakthrough (EN + PL)
  - AI Revolution 2025 (EN + PL)
  - iPhone 16 Pro Max (EN + PL)

**Итого в Supabase:** ~17 статей (23 - 6 = 17)

**На фронтенде (через 2-3 минуты):**
- Категория Tech: покажет TechCrunch + Wylsa + старые Published
- Все статьи будут открываться ✅
- Нет Application Error ✅

---

## 🧪 **ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ:**

1. **Подождать 2-3 минуты** (кеш обновится)
2. Открыть: https://app.icoffio.com/en/category/tech
3. Должно показаться **~7-9 статей**
4. Кликнуть на **TechCrunch** - должна открыться! ✅
5. Кликнуть на **Wylsa GameHub** - должна открыться! ✅

---

## 💡 **БЫСТРАЯ ПРОВЕРКА В SUPABASE:**

```sql
-- Посмотреть все статьи
SELECT 
  id, 
  title, 
  slug_en,
  published,
  created_at
FROM published_articles
ORDER BY created_at DESC;

-- Должно показать:
-- ✅ Published статьи (старые + новые 5)
-- ❌ Тестовые удалены
```

---

**Файл с полным SQL:** `scripts/publish-articles-direct.sql`

**Выполните в Supabase Dashboard!** 🚀

