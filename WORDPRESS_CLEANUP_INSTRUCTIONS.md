# 🗑️ WORDPRESS СТАТЬИ - ИНСТРУКЦИЯ ПО ОЧИСТКЕ

## 🚨 **НАЙДЕНЫ ПРОБЛЕМНЫЕ СТАТЬИ**

API обнаружил **15 статей с русскими заголовками** в WordPress базе:

### **🎯 Главные проблемы:**
- ❌ **"Статья с сайта techcrunch.com (EN)"** - slug: `techcrunch-com-en`
- ❌ **"Статья с сайта techcrunch.com"** - slug: `techcrunch-com-ru` 
- ❌ **"Прорыв в AI"** с русскими заголовками
- ❌ **"AI и автоматизация"** статьи
- ❌ **"Article from wylsa.com"** (3 дубля)
- ❌ **"Нейросети: революция"** и другие

---

## ✅ **СПОСОБЫ УДАЛЕНИЯ**

### **🔧 СПОСОБ 1 - WordPress Admin (Рекомендуется)**

1. **Зайди в WordPress Admin:**
   - URL: **https://icoffio.com/wp-admin**
   - Логин: твой WordPress админ логин
   - Пароль: твой WordPress админ пароль

2. **Перейди в Posts:**
   - **Posts** → **All Posts**

3. **Найди проблемные статьи:**
   - Поиск: **"Статья с сайта"**
   - Поиск: **"techcrunch"** 
   - Поиск: **"wylsa"**
   - Поиск: **"AI и автоматизация"**

4. **Удали статьи:**
   - Выбери чекбоксы проблемных статей
   - Bulk Actions → **Move to Trash**
   - Apply
   - Затем **Empty Trash** для полного удаления

### **🤖 СПОСОБ 2 - Через наш API**

```bash
# Сначала получи список проблемных статей:
curl -X POST "https://app.icoffio.com/api/admin/delete-wp-article" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_problematic", "password": "icoffio2025"}'

# Затем удали конкретную статью:
curl -X POST "https://app.icoffio.com/api/admin/delete-wp-article" \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_specific", "slug": "techcrunch-com-en", "password": "icoffio2025"}'
```

---

## 📋 **ПОЛНЫЙ СПИСОК УДАЛЕНИЯ**

**Удалить ВСЕ статьи с этими slug:**
- `techcrunch-com-en`
- `techcrunch-com-ru`  
- `ai-edited-test-en-2`
- `ai-edited-test-ru-2`
- `ai-2025-en-3`
- `ai-2025-ru-3`
- `ai-2025-en-2`
- `ai-2025-ru-2`
- `en` (просто "en")
- `ru` (просто "ru")
- `wylsa-com-en-3`
- `wylsa-com-en-2`
- `wylsa-com-en`

---

## 🚀 **БЫСТРОЕ РЕШЕНИЕ - WordPress Admin**

**Делай поэтапно:**

### **Этап 1: Русские заголовки**
1. Поиск в WordPress: **"Статья с сайта"**
2. Выбери ВСЕ найденные статьи
3. **Delete Permanently**

### **Этап 2: TechCrunch мусор**
1. Поиск: **"techcrunch"**
2. Удали ВСЕ тестовые статьи
3. **Delete Permanently**

### **Этап 3: Wylsa мусор**
1. Поиск: **"wylsa"**  
2. Удали ВСЕ статьи "Article from wylsa.com"
3. **Delete Permanently**

### **Этап 4: AI тесты**
1. Поиск: **"AI и автоматизация"**
2. Поиск: **"Прорыв в AI"**
3. Удали русские дубли
4. **Delete Permanently**

---

## 🎯 **ПОСЛЕ ОЧИСТКИ**

1. **Очисти кеши WordPress** (если есть кеширующие плагины)
2. **Обнови страницы сайта** (F5)
3. Проверь: **https://app.icoffio.com/en/articles**
4. **Убедись что русских заголовков нет**

---

## ✅ **ОЖИДАЕМЫЙ РЕЗУЛЬТАТ**

**ОСТАНУТСЯ ТОЛЬКО ЧИСТЫЕ СТАТЬИ:**
- ✅ "AI Revolution 2024: Transformative Breakthroughs" (13,697 слов)
- ✅ "Apple Vision Pro: Comprehensive Review" (12,562 слова) 
- ✅ "Digital Transformation Guide" (8,000+ слов)
- ✅ "Gaming Trends 2024" и другие качественные статьи

**ИСЧЕЗНУТ МУСОРНЫЕ СТАТЬИ:**
- ❌ Все с русскими заголовками
- ❌ "Article from" тестовые статьи
- ❌ Дубли и тестовый контент

---

**ИСПОЛЬЗУЙ WordPress Admin для быстрого и безопасного удаления!** 🚀
