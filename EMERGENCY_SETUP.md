# 🚨 EMERGENCY SETUP - WordPress Disabled

## ✅ КОД ЗАДЕПЛОЕН

**Версия:** v7.15.2-emergency  
**Статус:** Waiting for env variable  
**Deploy:** В процессе (~3 минуты)

---

## 🔧 НАСТРОЙКА В VERCEL (ОБЯЗАТЕЛЬНО!)

### Шаг 1: Откройте Vercel Dashboard
```
https://vercel.com/dashboard
```

### Шаг 2: Выберите проект
```
icoffio-front
```

### Шаг 3: Settings → Environment Variables

Нажмите **"Add New"**

**Variable Name:**
```
WORDPRESS_DISABLED
```

**Value:**
```
true
```

**Environments:** Выберите ВСЕ:
- ✅ Production
- ✅ Preview  
- ✅ Development

Нажмите **"Save"**

### Шаг 4: Redeploy

После добавления env variable:
1. Deployments → Latest deployment
2. Три точки (⋯) → "Redeploy"
3. Подождите 2-3 минуты

---

## 📊 ЧТО ЭТО ДЕЛАЕТ

### ДО (WordPress enabled):
```
1. AI генерирует статью (30s)
2. Генерирует изображения (20s)
3. Публикует в WordPress EN (120s+) ← ЗАВИСАЕТ!
4. Публикует в WordPress PL (120s+) ← ЗАВИСАЕТ!
5. TIMEOUT after 249s ❌
```

### ПОСЛЕ (WordPress disabled):
```
1. AI генерирует статью (30s)
2. Генерирует изображения (20s)
3. Возвращает mock success (0.1s) ← FAST!
4. Уведомление Telegram (1s)
5. SUCCESS in ~52s ✅
```

---

## ⚠️ ВАЖНО: ЧТО НЕ БУДЕТ РАБОТАТЬ

### ❌ Статьи НЕ публикуются в WordPress:
- admin.icoffio.com/wp-admin → НЕТ новых статей
- www.icoffio.com (старый WP сайт) → НЕТ новых статей

### ❌ app.icoffio.com URL НЕ работают:
- Telegram отправит URL: `https://app.icoffio.com/en/article/...`
- Но эти URL вернут 404 (статьи нет в WordPress)

### ✅ ЧТО РАБОТАЕТ:
- ✅ Генерация контента
- ✅ AI обработка
- ✅ Изображения
- ✅ Telegram уведомления
- ✅ Queue processing (БЫСТРО!)

---

## 🎯 ТЕСТ ПОСЛЕ SETUP

### 1. Дождитесь redeploy (3 минуты)

### 2. В Telegram:
```
/clear_queue
```

### 3. Отправьте тест:
```
AI enables smart automation.
```

### 4. Через 50-60 секунд должно прийти:
```
✅ ОПУБЛИКОВАНО!
📝 Заголовок: AI Enables Smart Automation
💬 Слов: ~500
⏱️ Время: 52s ← БЫСТРО!
🇬🇧 EN: https://app.icoffio.com/en/article/... (404!)
🇵🇱 PL: https://app.icoffio.com/pl/article/... (404!)
```

**URL НЕ будут работать** - это ожидаемо!

---

## 💡 КОГДА ВКЛЮЧИТЬ ОБРАТНО

Когда WordPress сервер будет починен:

### Вариант A: Удалить env variable
1. Vercel → Settings → Environment Variables
2. Найти `WORDPRESS_DISABLED`
3. Delete
4. Redeploy

### Вариант B: Изменить значение
1. Vercel → Settings → Environment Variables
2. `WORDPRESS_DISABLED` → Edit
3. Изменить на `false`
4. Redeploy

---

## 🔍 КАК ПРОВЕРИТЬ WORDPRESS

Откройте в браузере:
```
https://admin.icoffio.com/wp-json/wp/v2/posts
```

**Ожидаемый результат:**
- Должен открыться JSON с постами
- Время загрузки < 2 секунды

**Если:**
- Timeout / Connection refused → Сервер упал
- Загрузка > 10 секунд → Сервер медленный
- 403 Forbidden → Rate limiting

---

**ДОБАВЬТЕ ENV VARIABLE И REDEPLOY!**
**Затем протестируйте в Telegram!**
