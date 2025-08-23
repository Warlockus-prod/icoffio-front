# 🐙 GitHub Deployment Guide for icoffio.com

## 🎯 **Overview**
Этот проект настроен для автоматического деплоя через **GitHub + Vercel**. При каждом push в `main` ветку сайт автоматически обновляется.

---

## 🚀 **Быстрый старт - Деплой за 5 минут**

### **1. Создать GitHub репозиторий**
```bash
# Создайте новый репозиторий на GitHub.com
# Имя: icoffio-front (или любое другое)

# Подключите локальный проект
git remote add origin https://github.com/your-username/icoffio-front.git
git branch -M main
git push -u origin main
```

### **2. Подключить к Vercel**
1. Идите на [vercel.com](https://vercel.com)
2. "New Project" → "Import Git Repository"
3. Выберите ваш GitHub репозиторий
4. Настройте environment variables (см. ниже)
5. Deploy!

### **3. Environment Variables в Vercel**
```bash
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql  
REVALIDATE_TOKEN=your-secure-token-here
```

---

## 🔄 **Workflow - Как делать обновления**

### **Обновления кода:**
```bash
# 1. Внесите изменения в код
# 2. Коммитните и пушьте
git add .
git commit -m "✨ Add new feature"
git push origin main

# 3. Vercel автоматически деплоит! 🎉
```

### **Обновления контента:**
```bash
# Через WordPress админку → автоматическое обновление сайта
# Или принудительно:
curl -X POST "https://your-domain.com/api/revalidate?secret=TOKEN&path=/"
```

---

## 🌐 **Настройка доменов в Vercel**

### **Суб-домены (рекомендуется):**
В Vercel панели → Settings → Domains:
- `icoffio.com` → English (основной)  
- `pl.icoffio.com` → Polish
- `de.icoffio.com` → German
- `ro.icoffio.com` → Romanian
- `cs.icoffio.com` → Czech

### **DNS настройки:**
```
icoffio.com      A     76.76.19.19
*.icoffio.com    CNAME cname.vercel-dns.com
```

---

## 📁 **Структура проекта для команды**

### **Ветки:**
- `main` - продакшн (автодеплой)
- `develop` - разработка  
- `feature/*` - новые фичи
- `hotfix/*` - срочные исправления

### **Коммиты:**
```bash
# Используйте префиксы:
✨ feat: новая функция
🐛 fix: исправление бага
📝 docs: документация
💄 style: стили/дизайн
♻️  refactor: рефакторинг
⚡ perf: производительность  
✅ test: тесты
🔧 build: сборка
```

### **Pull Requests:**
```bash
# Создание PR:
git checkout -b feature/new-language
git push origin feature/new-language

# На GitHub создайте PR → main
# Vercel создаст preview deployment!
```

---

## 🔧 **Команды для разработки**

### **Локальная разработка:**
```bash
npm run dev          # Запуск dev-сервера
npm run build        # Проверка сборки
npm run seed         # Добавить контент в WordPress
```

### **Проверка перед деплоем:**
```bash
# Проверить TypeScript
npm run build

# Проверить все языки
open http://localhost:3000/en
open http://localhost:3000/pl  
open http://localhost:3000/de
```

---

## 🚨 **Troubleshooting**

### **Сайт не обновляется после деплоя:**
```bash
# Принудительная ревалидация
curl -X POST "https://your-domain.com/api/revalidate?secret=TOKEN&path=/"

# Или через Vercel панель → Functions → Redeploy
```

### **Ошибки сборки:**
```bash
# Проверить локально
npm run build

# Проверить environment variables в Vercel
# Проверить версию Node.js (должна быть 18+)
```

### **Языки не переключаются:**
```bash
# Проверить middleware.ts
# Проверить настройки домена в Vercel
# Проверить DNS записи для субдоменов
```

---

## 📊 **Мониторинг**

### **Vercel Analytics:**
- Автоматически включен  
- Просмотр в Vercel панели → Analytics
- Real-time metrics и Web Vitals

### **Error Monitoring:**
- Vercel Functions → Error tracking
- Browser console для Web Vitals
- Uptime monitoring (рекомендуется внешний)

---

## 🎯 **Roadmap для команды**

### **Краткосрочно (1-2 недели):**
- [ ] Настроить Google Analytics
- [ ] Добавить больше контента в каждую языковую версию
- [ ] Оптимизировать изображения
- [ ] Настроить мониторинг uptime

### **Среднесрочно (1 месяц):**
- [ ] A/B тестирование дизайна
- [ ] SEO аудит и улучшения
- [ ] Интеграция с социальными сетями
- [ ] Newsletter subscription

### **Долгосрочно (3+ месяца):**
- [ ] Mobile приложение
- [ ] AI-переводчик контента
- [ ] Advanced analytics
- [ ] Реклама и монетизация

---

## 🔐 **Безопасность**

### **Environment Variables:**
- Никогда не коммитьте `.env.local`
- Используйте сильные токены для `REVALIDATE_TOKEN`
- WordPress пароли только в Vercel environment

### **WordPress:**
- Регулярные обновления
- Strong application passwords
- Backup стратегия

---

## ✅ **Чеклист готовности**

- [x] **Код**: TypeScript без ошибок
- [x] **Сборка**: `npm run build` успешно
- [x] **Контент**: WordPress заполнен контентом
- [x] **Языки**: Все 5 языков работают
- [x] **SEO**: Meta теги настроены
- [x] **Performance**: Web Vitals мониторинг
- [x] **Git**: Репозиторий готов
- [x] **Vercel**: Конфигурация готова

**🎉 ГОТОВ К ПРОДАКШН ДЕПЛОЮ!**
