# Управление модулями проекта ICoffio

## 📋 Структура проекта

Это монорепозиторий, содержащий:
- **Web-приложение** (Next.js): `icoffio-clone-nextjs/`
- **Мобильное приложение** (React Native): `icoffioApp/`

## 🌿 Структура веток

### Основные ветки
- **`main`** — продакшн (только стабильные релизы)
- **`develop`** — интеграционная ветка (все изменения сначала сюда)

### Модульные ветки (долгоживущие)
```
feature/module-mobile-app        — React Native приложение
feature/module-web-admin         — Админ-панель (управление контентом)
feature/module-web-parser        — Парсинг статей (TechCrunch, Wylsa и др.)
feature/module-web-telegram      — Telegram-бот и интеграция
feature/module-web-ads           — Рекламные блоки (VOX Media, кастом)
feature/module-web-home          — Главная страница и навигация
feature/module-web-analytics     — Статистика, просмотры, популярные статьи
```

## 📦 Описание модулей

### 1. **module-web-admin** — Админ-панель
**Файлы:**
- `icoffio-clone-nextjs/app/[locale]/admin/`
- `icoffio-clone-nextjs/components/admin/` (41 компонент)
- `icoffio-clone-nextjs/app/api/admin/` (роуты: auth, publish, delete, bulk-operations)

**Функции:**
- Создание/редактирование статей
- AI-генерация контента (OpenAI)
- Массовый перевод
- Управление изображениями
- Cleanup-инструменты

---

### 2. **module-web-parser** — Парсинг источников
**Файлы:**
- `icoffio-clone-nextjs/app/api/admin/parse-url/route.ts`
- `icoffio-clone-nextjs/lib/url-parser-service.ts`
- `icoffio-clone-nextjs/lib/wordpress-service.ts`
- `icoffio-clone-nextjs/scripts/seed-wp*.ts`

**Функции:**
- Парсинг TechCrunch, Wylsa, и др.
- Извлечение контента (Cheerio)
- Автоперевод через AI
- Импорт из WordPress

---

### 3. **module-web-telegram** — Telegram-бот
**Файлы:**
- `icoffio-clone-nextjs/app/api/telegram/` (webhook, settings, stats, queue)
- `icoffio-clone-nextjs/lib/telegram-*.ts` (6 файлов: i18n, database, image, compose)
- `icoffio-clone-nextjs/components/admin/TelegramDashboard.tsx`

**Функции:**
- Webhook для приёма ссылок от пользователей
- Очередь обработки (Supabase `telegram_jobs`)
- Статистика по юзерам
- Автопубликация с уведомлениями

---

### 4. **module-web-ads** — Рекламные блоки
**Файлы:**
- `icoffio-clone-nextjs/lib/vox-advertising.ts`
- `icoffio-clone-nextjs/components/UniversalAd.tsx`
- `icoffio-clone-nextjs/components/InlineAd.tsx`
- `icoffio-clone-nextjs/components/admin/AdvertisingManager.tsx`

**Функции:**
- VOX Media интеграция
- Кастомные баннеры
- Управление кодами через админку

---

### 5. **module-web-home** — Главная страница
**Файлы:**
- `icoffio-clone-nextjs/app/[locale]/(site)/page.tsx`
- `icoffio-clone-nextjs/components/Hero.tsx`
- `icoffio-clone-nextjs/components/CategoryNav.tsx`
- `icoffio-clone-nextjs/components/Newsletter.tsx`

**Функции:**
- Hero-баннер
- Категории (Tech, AI, Gadgets)
- Лента статей
- Подписка на рассылку

---

### 6. **module-web-analytics** — Статистика
**Файлы:**
- `icoffio-clone-nextjs/app/api/analytics/` (track-view, popular-articles)
- `icoffio-clone-nextjs/lib/supabase-analytics.ts`
- `icoffio-clone-nextjs/components/admin/ArticlePopularityStats.tsx`
- `icoffio-clone-nextjs/components/admin/ActivityLog.tsx`

**Функции:**
- Трекинг просмотров
- Популярные статьи
- Activity log (действия админов)
- Блокировка юзеров

---

### 7. **module-mobile-app** — React Native
**Файлы:**
- `icoffioApp/` (весь каталог)
- `icoffioApp/src/screens/` (Home, Article, Search, Categories)
- `icoffioApp/src/components/MobileAd.tsx`

**Функции:**
- iOS/Android приложение
- WebView для статей
- Мобильная реклама
- Bottom Tab навигация

---

## 🚀 Рабочий процесс для разработчиков

### Шаг 1: Клонирование репо
\`\`\`bash
git clone <URL_РЕПОЗИТОРИЯ>
cd icoffio-front
npm install  # или yarn
\`\`\`

### Шаг 2: Выбор модуля
Разработчик получает задачу (например, "Добавить фильтр по дате в Telegram Dashboard").

**Модуль:** `module-web-telegram`

### Шаг 3: Создание рабочей ветки
\`\`\`bash
# Переключиться на develop (или модульную ветку)
git checkout develop

# Создать feature-ветку
git checkout -b feature/telegram-date-filter

# Работать, коммитить
git add .
git commit -m "feat(telegram): add date filter to dashboard"
\`\`\`

### Шаг 4: Push и Pull Request
\`\`\`bash
git push -u origin feature/telegram-date-filter
\`\`\`

Затем на GitHub:
1. Открыть PR в **\`develop\`**
2. Указать лейбл \`module:telegram\`
3. Описать изменения

### Шаг 5: Ревью менеджера
Менеджер:
- Проверяет код
- Тестирует локально
- Мержит в \`develop\` (или сначала в \`feature/module-web-telegram\`, потом в \`develop\`)

---

## 🎯 Процесс для менеджера

### 1. Создание задач (Issues)
Создавайте issue с лейблами:
- \`module:admin\`
- \`module:parser\`
- \`module:telegram\`
- \`module:ads\`
- \`module:home\`
- \`module:analytics\`
- \`module:mobile\`

Пример:
\`\`\`
Название: [Telegram] Добавить кнопку "Удалить из очереди"
Лейбл: module:telegram, enhancement
Описание: ...
\`\`\`

### 2. Назначение разработчику
- Assign issue на человека
- Он создаёт ветку от \`develop\` или от \`feature/module-*\`
- Открывает PR

### 3. Ревью и мердж
- Проверяете PR
- Если ОК → Merge в \`develop\`
- Если нужна интеграция → Merge в модульную ветку, потом групповой PR в \`develop\`

### 4. Релиз в прод
Когда \`develop\` стабилен:
\`\`\`bash
git checkout main
git merge develop
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin main --tags
\`\`\`

---

## 🛡️ Защита веток (рекомендации для GitHub)

### Settings → Branches → Branch protection rules

**Для \`main\`:**
- ✅ Require pull request before merging
- ✅ Require approvals (1+)
- ✅ Require status checks to pass
- ✅ Do not allow bypassing

**Для \`develop\`:**
- ✅ Require pull request before merging
- ✅ Require approvals (1)

**Модульные ветки (\`feature/module-*\`):**
- Можно оставить без жёсткой защиты (разработчики могут пушить напрямую для быстрой итерации)

---

## 📝 Соглашения по коммитам

\`\`\`
feat(module): добавил новую фичу
fix(module): исправил баг
chore(module): обновил зависимости
docs(module): обновил документацию
style(module): форматирование кода
refactor(module): рефакторинг без изменения логики
test(module): добавил тесты
\`\`\`

Примеры:
\`\`\`
feat(telegram): add retry logic for failed jobs
fix(admin): correct image upload validation
chore(mobile): bump react-native to 0.82.1
\`\`\`

---

## 🔍 Полезные команды

### Проверить, какие файлы относятся к модулю:
\`\`\`bash
# Админка
git log --oneline --name-only develop -- icoffio-clone-nextjs/components/admin/ | head -n 50

# Telegram
git log --oneline --name-only develop -- icoffio-clone-nextjs/app/api/telegram/ icoffio-clone-nextjs/lib/telegram-*.ts
\`\`\`

### Синхронизация модульной ветки с develop:
\`\`\`bash
git checkout feature/module-web-telegram
git merge develop
git push
\`\`\`

### Список веток с последним коммитом:
\`\`\`bash
git branch -v
\`\`\`

---

## 📞 Контакты
По вопросам:
- **Менеджер:** [указать Telegram/email]
- **Документация:** \`/icoffio-clone-nextjs/PROJECT_MASTER_DOCUMENTATION.md\`
