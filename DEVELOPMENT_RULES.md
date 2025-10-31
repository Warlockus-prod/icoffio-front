# 📐 ПРАВИЛА РАЗРАБОТКИ ICOFFIO

**Версия правил:** 1.0  
**Дата создания:** 22 октября 2025  
**Статус:** ОБЯЗАТЕЛЬНЫ К ИСПОЛНЕНИЮ ⚠️

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА (НИКОГДА НЕ НАРУШАТЬ!)

### 1. Версионирование (Semantic Versioning)

**Формат:** `MAJOR.MINOR.PATCH`

```
MAJOR - несовместимые изменения API (4.0.0 → 5.0.0)
MINOR - новая функциональность (4.7.0 → 4.8.0)
PATCH - исправления багов (4.7.0 → 4.7.1)
```

**ПРАВИЛО:** Каждый релиз ДОЛЖЕН иметь тег и запись в CHANGELOG.md

**Пример:**
```bash
# После завершения работы:
git tag -a v4.7.1 -m "Fix: категории fallback"
git push origin v4.7.1
```

---

### 2. Git Flow (ОБЯЗАТЕЛЬНЫЙ WORKFLOW)

#### Feature Development

```bash
# 1. Создать feature branch от main
git checkout main
git pull origin main
git checkout -b feature/название-функции

# 2. Разработка (коммиты с префиксами)
git add .
git commit -m "✨ Add: описание"
git commit -m "🐛 Fix: описание"
git commit -m "📝 Docs: описание"

# 3. Перед merge - обновить main
git checkout main
git pull origin main
git checkout feature/название-функции
git rebase main  # Или merge main

# 4. Тестирование (ОБ MAIN 5. Push feature branch
git push origin feature/название-функции

# 6. После РУЧНОЙ проверки - merge в main
git checkout main
git merge feature/название-функции
git push origin main
```

#### ⚠️ ПРАВИЛА:
- ✅ Всегда работать в feature branches
- ✅ НИКОГДА не коммитить напрямую в main
- ✅ Один feature = один branch
- ✅ Удалять branch после merge

---

### 3. Обязательное тестирование (ДО КАЖДОГО PUSH)

#### Локальное тестирование (ВСЕГДА!)

```bash
# ШАГ 1: Чистая сборка
npm run build

# Должно быть:
# ✓ Compiled successfully
# ✓ 0 TypeScript errors
# ✓ Все routes присутствуют

# Если есть ошибки - ИСПРАВИТЬ перед push!
```

```bash
# ШАГ 2: Development сервер
npm run dev

# Проверить ВРУЧНУЮ:
# ✅ http://localhost:3000/en - загружается
# ✅ Header отображается
# ✅ Footer на месте
# ✅ Навигация работает
# ✅ Темная тема переключается
# ✅ Нет ошибок в консоли

# Открыть браузер и РЕАЛЬНО проверить!
```

```bash
# ШАГ 3: TypeScript проверка
npx tsc --noEmit

# Должно быть: 0 errors
```

#### Тестирование критических путей

**Обязательно проверить:**
- [ ] Главная страница (/)
- [ ] Категория (/en/category/ai)
- [ ] Статья (/en/article/any-slug)
- [ ] Админ панель (/en/admin)
- [ ] API health (/api/articles - POST {action: "health"})

---

### 4. Система Backup (ДО КАЖДОГО PUSH)

```bash
# ВСЕГДА создавать backup перед push
git diff > backups/backup-$(date +%Y%m%d-%H%M%S).patch

# Или использовать helper:
./scripts/create-backup.sh  # Создать этот скрипт!
```

**Структура backup:**
```
backups/
├── backup-20251022-143000.patch
├── backup-20251023-091500.patch
└── README.md (описание каждого backup)
```

---

### 5. Commit Messages (СТРОГИЙ ФОРМАТ)

**Формат:** `[тип] Описание`

**Типы:**
```
✨ Add:      новая функциональность
🐛 Fix:      исправление бага
📝 Docs:     документация
🎨 Style:    форматирование, стили
♻️ Refactor: рефакторинг кода
⚡ Perf:     оптимизация производительности
✅ Test:     добавление тестов
🔧 Config:   конфигурация
🗑️ Remove:   удаление кода/файлов
🔄 Revert:   откат изменений
```

**Примеры:**
```bash
git commit -m "✨ Add: fallback система для категорий"
git commit -m "🐛 Fix: TypeScript ошибка в Header компоненте"
git commit -m "📝 Docs: обновление CHANGELOG для v4.7.1"
git commit -m "⚡ Perf: оптимизация загрузки изображений"
```

**ПРАВИЛО:** Каждый commit должен быть атомарным (одно логическое изменение)

---

### 6. CHANGELOG Обновление (С КАЖДЫМ РЕЛИЗОМ)

**Процесс:**

```markdown
## [Unreleased]
### Added
- Feature 1
- Feature 2

### Fixed  
- Bug 1
- Bug 2
```

**При релизе:**
```markdown
## [4.7.1] - 2025-10-23

### Added
- ✅ Fallback система для категорий

### Fixed
- ✅ 500 ошибка на страницах категорий
- ✅ TypeScript warnings устранены

### Changed
- Performance улучшения
```

**ПРАВИЛО:** Каждый релиз ДОЛЖЕН быть задокументирован в CHANGELOG.md

---

## 📋 ПРОЦЕСС ДОБАВЛЕНИЯ НОВОЙ ФУНКЦИИ

### Шаг 1: Планирование (5-10 минут)

**Ответьте на вопросы:**
1. Что именно добавляем?
2. Какие файлы затронуты?
3. Критичный ли это компонент?
4. Нужен ли fallback?
5. Как будем тестировать?

**Создать TODO список:**
```markdown
- [ ] Создать feature branch
- [ ] Разработать функцию
- [ ] Добавить fallback (если нужно)
- [ ] Тестировать локально
- [ ] Обновить CHANGELOG.md
- [ ] Создать backup
- [ ] Push и verify
```

---

### Шаг 2: Создание Feature Branch

```bash
# Формат имени: feature/краткое-описание
git checkout -b feature/category-fallback

# Для багфиксов: fix/описание-бага
git checkout -b fix/header-mobile-issue

# Для документации: docs/что-документируем
git checkout -b docs/api-endpoints
```

---

### Шаг 3: Разработка

**Правила во время разработки:**

1. **Маленькие коммиты** - лучше 5 маленьких, чем 1 большой
2. **Fallback система** - ВСЕГДА добавлять для критических компонентов
3. **TypeScript** - исправлять ошибки сразу, не накапливать
4. **Тестировать часто** - после каждого значимого изменения

**Пример хорошей разработки:**
```bash
# Коммит 1: Базовая структура
git commit -m "✨ Add: базовая структура категории fallback"

# Коммит 2: Mock данные
git commit -m "✨ Add: mock данные для категорий"

# Коммит 3: Try/catch логика
git commit -m "✨ Add: error handling с fallback"

# Коммит 4: Тестирование и фиксы
git commit -m "🐛 Fix: TypeScript ошибки в CategoryPage"
```

---

### Шаг 4: Локальное тестирование (КРИТИЧНО!)

**Чек-лист:**
```bash
# 1. Build
npm run build
# Статус: ✅ / ❌

# 2. TypeScript
npx tsc --noEmit
# Статус: ✅ / ❌

# 3. Development server
npm run dev
# Проверить в браузере:
# - Главная страница: ✅ / ❌
# - Измененная функциональность: ✅ / ❌
# - Другие страницы (не сломали): ✅ / ❌

# 4. Console errors
# Открыть DevTools → Console
# Ошибок нет: ✅ / ❌
```

**ПРАВИЛО:** Все ✅ - можно продолжать. Хоть один ❌ - исправить!

---

### Шаг 5: Обновление документации

**Обязательно обновить:**

1. **CHANGELOG.md** - добавить в [Unreleased]
```markdown
## [Unreleased]
### Added
- ✅ Fallback система для страниц категорий
```

2. **README.md** - если изменился API или использование

3. **Комментарии в коде** - документировать сложную логику

---

### Шаг 6: Pre-deploy Checklist

**Использовать:** `PRE_DEPLOY_CHECKLIST.md`

```bash
# Быстрая проверка:
npm run build && echo "✅ Build OK" || echo "❌ FAILED"
git diff > backups/backup-$(date +%Y%m%d-%H%M%S).patch
git status  # Проверить что коммитим
```

---

### Шаг 7: Push и Merge

```bash
# 1. Push feature branch
git push origin feature/category-fallback

# 2. Подождать Vercel preview deploy (1-2 минуты)

# 3. Проверить preview URL
# https://icoffio-front-xxxx.vercel.app

# 4. Если все ОК - merge в main
git checkout main
git pull origin main
git merge feature/category-fallback

# 5. Обновить версию и создать тег
npm version patch  # или minor, или major
# Это обновит package.json автоматически

# 6. Push main с тегом
git push origin main
git push origin --tags

# 7. Удалить feature branch
git branch -d feature/category-fallback
git push origin --delete feature/category-fallback
```

---

### Шаг 8: Production Verification (5 минут после deploy)

```bash
# 1. HTTP Status
curl -I https://app.icoffio.com/en
# Должно быть: HTTP/2 200

# 2. Открыть в браузере
open https://app.icoffio.com

# 3. Проверить измененную функциональность
# 4. Проверить что ничего не сломалось
# 5. Проверить Console на ошибки

# 6. Если проблемы - НЕМЕДЛЕННЫЙ ОТКАТ
git reset --hard HEAD~1
git push origin main --force
```

---

## 🔄 ПРОЦЕСС ВЕРСИОНИРОВАНИЯ

### Когда увеличивать версию?

**PATCH (4.7.0 → 4.7.1):**
- Исправления багов
- Мелкие улучшения
- Обновление документации
- Performance оптимизации

**MINOR (4.7.1 → 4.8.0):**
- Новая функциональность
- Новые компоненты
- Новые API endpoints
- Обратно совместимые изменения

**MAJOR (4.8.0 → 5.0.0):**
- Breaking changes
- Несовместимые изменения API
- Удаление функциональности
- Полный редизайн

---

### Команды версионирования

```bash
# Патч (bugfix)
npm version patch
# 4.7.0 → 4.7.1

# Minor (новая функция)
npm version minor
# 4.7.1 → 4.8.0

# Major (breaking changes)
npm version major
# 4.8.0 → 5.0.0

# Это автоматически:
# 1. Обновит package.json
# 2. Создаст git commit
# 3. Создаст git tag
```

**После версионирования:**
```bash
# 1. Обновить CHANGELOG.md вручную
# Переместить [Unreleased] в [новая версия]

# 2. Commit CHANGELOG
git add CHANGELOG.md
git commit -m "📝 Docs: CHANGELOG для v4.7.1"

# 3. Push с тегами
git push origin main --tags
```

---

## 🧪 ПРАВИЛА ТЕСТИРОВАНИЯ

### Уровни тестирования

**1. Локальное (ВСЕГДА):**
- Build успешный
- TypeScript 0 errors
- Development server работает
- Visual проверка в браузере

**2. Preview Deploy (ЖЕЛАТЕЛЬНО):**
- Vercel preview URL
- Проверка на staging-подобном environment

**3. Production (ОБЯЗАТЕЛЬНО после deploy):**
- HTTP Status 200
- Функциональность работает
- Нет console errors
- Мониторинг 10 минут после deploy

---

### Тестовые сценарии (МИНИМУМ)

**Каждый раз перед deploy:**

```bash
# Сценарий 1: Главная страница
curl -I https://app.icoffio.com/en
# Ожидание: HTTP/2 200

# Сценарий 2: Категории (после исправления)
curl -I https://app.icoffio.com/en/category/ai
# Ожидание: HTTP/2 200

# Сценарий 3: API Health
curl -X POST https://app.icoffio.com/api/articles \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
# Ожидание: {"status":"ok",...}

# Сценарий 4: Admin panel
curl -I https://app.icoffio.com/en/admin
# Ожидание: HTTP/2 200
```

---

## 📁 СТРУКТУРА ПРОЕКТА

### Где что находится

```
icoffio-clone-nextjs/
├── app/                      # Next.js App Router
│   ├── [locale]/            # i18n pages
│   │   ├── (site)/          # Публичные страницы
│   │   └── admin/           # Админ панель
│   └── api/                 # API Routes
├── components/              # React компоненты
│   ├── admin/              # Админ компоненты
│   └── [публичные]         # Header, Footer, etc.
├── lib/                     # Утилиты и сервисы
│   ├── data.ts             # WordPress GraphQL
│   └── [services]          # API сервисы
├── backups/                 # Git backups (создать!)
├── scripts/                 # Helper scripts
└── [документация]          # MD файлы
```

---

## 🚫 ЧТО КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО

### НИКОГДА не делайте:

1. **Множественные релизы в день** ❌
   ```
   ❌ ПЛОХО: 6 релизов 20 октября
   ✅ ХОРОШО: 1 релиз, затем мониторинг
   ```

2. **Force push без backup** ❌
   ```bash
   ❌ ПЛОХО: git push origin main --force
   ✅ ХОРОШО: 
   git diff > backup.patch
   git push origin main --force
   ```

3. **Коммит в main напрямую** ❌
   ```bash
   ❌ ПЛОХО: 
   git checkout main
   git commit -m "quick fix"
   
   ✅ ХОРОШО:
   git checkout -b fix/quick-fix
   git commit -m "🐛 Fix: описание"
   # Тестирование
   git checkout main
   git merge fix/quick-fix
   ```

4. **Push без тестирования** ❌
   ```bash
   ❌ ПЛОХО:
   git commit -m "Add feature"
   git push
   
   ✅ ХОРОШО:
   npm run build  # Проверка
   npm run dev    # Тестирование
   git commit -m "✨ Add: feature"
   git push
   ```

5. **Удаление fallback систем** ❌
   ```typescript
   ❌ ПЛОХО:
   const posts = await getAllPosts();
   
   ✅ ХОРОШО:
   let posts = mockPosts;
   try {
     const data = await getAllPosts();
     if (data && data.length > 0) posts = data;
   } catch (error) {
     console.error('Using fallback');
   }
   ```

---

## 🆘 ПРОЦЕДУРА ОТКАТА

### Если что-то пошло не так

```bash
# 1. НЕМЕДЛЕННО откатиться на 1 коммит
git reset --hard HEAD~1
git push origin main --force

# 2. Проверить production
curl -I https://app.icoffio.com/en

# 3. Если не помогло - откат к известной версии
git reset --hard v4.7.0  # Последняя стабильная
git push origin main --force

# 4. Vercel автоматически задеплоит откат

# 5. Изучить проблему в backup
git diff HEAD v4.7.0 > problem-analysis.patch

# 6. Исправить в feature branch
git checkout -b fix/rollback-issue
# Исправления
# Тестирование
# Новый deploy
```

---

## 📊 МОНИТОРИНГ ПОСЛЕ DEPLOY

### Первые 10 минут (КРИТИЧНО!)

**Проверить:**
1. HTTP Status всех критических страниц
2. Vercel Analytics - traffic flow
3. Browser Console - нет ошибок
4. Vercel Logs - нет server errors

**Если проблемы - ОТКАТ!**

---

## 📚 ОБЯЗАТЕЛЬНАЯ ДОКУМЕНТАЦИЯ

### При каждом релизе обновлять:

1. **CHANGELOG.md** - всегда!
2. **package.json** - версия (через npm version)
3. **README.md** - если изменился API
4. **Код комментарии** - для сложной логики

### Создавать при необходимости:

1. **Feature документация** - для больших функций
2. **API документация** - для новых endpoints
3. **Migration guide** - для breaking changes

---

## ✅ ЧЕКЛИСТ ПЕРЕД РЕЛИЗОМ

```markdown
### Pre-Release Checklist

- [ ] Feature branch создан и разработка завершена
- [ ] Все коммиты имеют правильный формат
- [ ] `npm run build` успешен (0 errors)
- [ ] `npx tsc --noEmit` чист (0 errors)
- [ ] Локальное тестирование пройдено
- [ ] Backup создан
- [ ] CHANGELOG.md обновлен
- [ ] Версия увеличена (npm version)
- [ ] Git tag создан
- [ ] PRE_DEPLOY_CHECKLIST.md выполнен
- [ ] Готов план отката (если что-то пойдет не так)

### Post-Deploy Verification

- [ ] Production HTTP Status 200
- [ ] Функциональность работает
- [ ] Нет console errors
- [ ] Vercel Analytics нормальный
- [ ] Мониторинг 10 минут - все стабильно
```

---

## 🎯 SUMMARY: ГЛАВНЫЕ ПРАВИЛА

### 5 ЗОЛОТЫХ ПРАВИЛ:

1. **Feature Branches** - всегда работать в branches, не в main
2. **Тестировать локально** - npm run build + visual проверка
3. **Backup всегда** - перед каждым push
4. **Один релиз в день** - не торопиться
5. **Fallback системы** - для критических компонентов

### Если следовать этим правилам:
✅ Сайт не сломается  
✅ Можно откатиться в любой момент  
✅ История изменений ясна  
✅ Разработка безопасна  

---

**Создано:** 22 октября 2025  
**Версия правил:** 1.0  
**Статус:** ОБЯЗАТЕЛЬНЫ К ИСПОЛНЕНИЮ

*Эти правила созданы на основе анализа проблем v1.4.0-v1.7.0 и призваны предотвратить их повторение.*









