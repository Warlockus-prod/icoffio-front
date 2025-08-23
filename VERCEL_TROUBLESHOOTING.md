# 🚨 VERCEL TROUBLESHOOTING GUIDE

## ❌ Возможные проблемы и решения:

### **1. Build Error в Vercel**
```
❌ Error: Type 'Buffer<ArrayBufferLike>' is not assignable
```
**Решение:** Уже исправлено - файлы в папке `scripts/` исключены из сборки

### **2. Environment Variables не работают**
```
❌ Error: process.env.NEXT_PUBLIC_WP_ENDPOINT is undefined
```
**Решение:** 
1. Settings → Environment Variables
2. Добавить все переменные из `VERCEL_ENV_VARIABLES.md`
3. Redeploy проект

### **3. WordPress API недоступен**
```
❌ Error: GraphQL endpoint not responding
```
**Решение:**
- Проверьте что `https://icoffio.com/graphql` работает
- Возможно нужно обновить CORS настройки в WordPress

### **4. Изображения не загружаются**
```
❌ Images from icoffio.com blocked
```
**Решение:** Уже исправлено в `next.config.mjs` - добавлены `remotePatterns`

### **5. 500 Internal Server Error**
**Проверьте в Vercel Dashboard:**
1. Functions → Runtime Logs
2. Найдите ошибку в логах
3. Обычно проблема в переменных окружения

### **6. Страницы не открываются (404)**
**Причины:**
- Middleware неправильно настроен
- Проблема с динамическими роутами

**Решение:** Уже исправлено - middleware настроен для i18n

---

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ:

### **Тест 1: Основная страница**
- `https://ваш-домен.vercel.app` → должна открыть английскую версию

### **Тест 2: Языки**  
- `https://ваш-домен.vercel.app/pl` → польская версия
- `https://ваш-домен.vercel.app/de` → немецкая версия

### **Тест 3: Статьи**
- `https://ваш-домен.vercel.app/en/article/любая-статья` → должна открыться

### **Тест 4: Telegram Bot**
- `POST https://ваш-домен.vercel.app/api/telegram` → должен отвечать

---

## 🔧 ЕСЛИ НУЖНА ПОМОЩЬ:

1. **Скриншот ошибки** из Vercel Dashboard
2. **URL проекта** на Vercel  
3. **Логи** из Functions → Runtime Logs

## 📞 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ:

```bash
# Если что-то сломалось, можно вернуть предыдущую версию:
git log --oneline  # Посмотреть коммиты
git revert HEAD    # Отменить последний коммит
git push origin main  # Vercel автоматически пересоберет
```
