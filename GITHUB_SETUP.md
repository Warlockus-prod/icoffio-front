# Публикация проекта на GitHub

Пошаговая инструкция для менеджера по выгрузке репозитория и настройке процессов.

---

## 1️⃣ Создание репозитория на GitHub

### Через веб-интерфейс:
1. Зайдите на [github.com](https://github.com)
2. Нажмите **"+"** → **"New repository"**
3. Заполните:
   - **Repository name:** \`icoffio-front\` (или любое имя)
   - **Description:** "ICoffio News — Next.js + React Native monorepo"
   - **Visibility:** **Private** (рекомендуется) или Public
   - **⚠️ НЕ инициализируйте** с README/gitignore/license (у нас уже есть)
4. Нажмите **"Create repository"**

Скопируйте SSH или HTTPS URL:
\`\`\`
git@github.com:your-username/icoffio-front.git
# или
https://github.com/your-username/icoffio-front.git
\`\`\`

---

## 2️⃣ Подключение remote и push

### В терминале:
\`\`\`bash
cd /Users/Andrey/App/icoffio-front

# Добавить удалённый репозиторий
git remote add origin git@github.com:your-username/icoffio-front.git

# Проверить, что добавлено
git remote -v

# Отправить все ветки
git push -u origin --all

# Отправить теги (если есть)
git push origin --tags
\`\`\`

**Результат:**
Все ветки (\`main\`, \`develop\`, \`feature/*\`) будут загружены на GitHub.

---

## 3️⃣ Настройка защиты веток

### Защита ветки \`main\`:
1. Зайдите в **Settings** → **Branches**
2. Нажмите **"Add branch protection rule"**
3. Введите **Branch name pattern:** \`main\`
4. Включите:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: **1**
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ **Require status checks to pass before merging** (если есть CI)
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
5. Нажмите **"Create"**

### Защита ветки \`develop\`:
Повторите то же самое для \`develop\`:
- Branch name pattern: \`develop\`
- Require approvals: **1**
- Остальное по желанию (можно менее строго)

---

## 4️⃣ Настройка лейблов для модулей

1. Зайдите в **Issues** → **Labels**
2. Создайте лейблы (нажмите **"New label"**):

| Название | Цвет | Описание |
|----------|------|----------|
| \`module:admin\` | \`#0052CC\` | Админ-панель |
| \`module:parser\` | \`#5319E7\` | Парсинг статей |
| \`module:telegram\` | \`#0088CC\` | Telegram-бот |
| \`module:ads\` | \`#FBCA04\` | Рекламные блоки |
| \`module:home\` | \`#D93F0B\` | Главная страница |
| \`module:analytics\` | \`#0E8A16\` | Аналитика и статистика |
| \`module:mobile\` | \`#F9D0C4\` | React Native приложение |

Дополнительно:
- \`bug\` (красный)
- \`enhancement\` (синий)
- \`documentation\` (зелёный)
- \`good first issue\` (фиолетовый)

---

## 5️⃣ Шаблоны для Pull Request

### Создайте файл \`.github/PULL_REQUEST_TEMPLATE.md\`:

\`\`\`bash
mkdir -p .github
cat > .github/PULL_REQUEST_TEMPLATE.md << 'PR_END'
## Описание
<!-- Что делает этот PR? -->

## Тип изменений
- [ ] Bug fix (исправление бага)
- [ ] New feature (новая функция)
- [ ] Refactoring (без изменения функциональности)
- [ ] Documentation (только документация)

## Модуль
<!-- Выберите и добавьте лейбл: module:admin, module:telegram, и т.д. -->

## Изменения
- 
- 
- 

## Тестирование
- [ ] Локальные тесты пройдены
- [ ] Проверено в браузере (для Web)
- [ ] Проверено на устройстве (для Mobile)
- [ ] Линтинг пройден (\`npm run lint\`)

## Скриншоты (если UI)
<!-- Приложите скриншоты или GIF -->

## Связанные Issue
Closes #

## Checklist
- [ ] Код соответствует стилю проекта
- [ ] Добавлена документация (если нужно)
- [ ] Не добавлены .env или секретные данные
PR_END

git add .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs: add PR template"
git push origin main
\`\`\`

---

## 6️⃣ Настройка CI/CD (опционально)

### GitHub Actions для линтинга:

\`\`\`bash
mkdir -p .github/workflows
cat > .github/workflows/lint.yml << 'WORKFLOW_END'
name: Lint

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  lint-mobile:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: icoffioApp
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
WORKFLOW_END

git add .github/workflows/lint.yml
git commit -m "ci: add lint workflow"
git push origin main
\`\`\`

---

## 7️⃣ Приглашение разработчиков

1. **Settings** → **Collaborators and teams**
2. Нажмите **"Add people"**
3. Введите GitHub username или email
4. Выберите роль:
   - **Admin** — для вас (полный доступ)
   - **Write** — для разработчиков (пуш в ветки, но не в \`main\`/\`develop\` из-за защиты)
   - **Read** — для наблюдателей

---

## 8️⃣ Инструкция для разработчика (отправьте им)

\`\`\`markdown
# Начало работы

1. Клонируйте репо:
   \`\`\`bash
   git clone git@github.com:your-username/icoffio-front.git
   cd icoffio-front
   \`\`\`

2. Установите зависимости:
   \`\`\`bash
   # Web
   npm install

   # Mobile
   cd ../icoffioApp && npm install
   \`\`\`

3. Настройте .env:
   - Скопируйте \`.env.example\` → \`.env.local\`
   - Попросите у менеджера ключи Supabase и OpenAI

4. Прочитайте:
   - \`CONTRIBUTING.md\` — как работать с ветками и PR
   - \`MODULE_MANAGEMENT.md\` — структура модулей

5. Возьмите задачу из Issues и приступайте!
\`\`\`

---

## 9️⃣ Процесс разработки (для вас как менеджера)

### Создание задачи:
1. **Issues** → **New issue**
2. Заполните:
   \`\`\`
   Название: [Telegram] Добавить кнопку "Retry" для неудачных джобов
   Лейблы: module:telegram, enhancement
   Assign: @developer-username
   \`\`\`
3. Создайте issue

### Когда разработчик открывает PR:
1. Проверьте код (Code review)
2. Запустите локально:
   \`\`\`bash
   git fetch origin
   git checkout feature/developer-branch
   npm install && npm run dev
   \`\`\`
3. Тестируйте функционал
4. Если всё ОК:
   - **Approve** в PR
   - **Merge pull request** → **Squash and merge** (рекомендуется)
5. Удалите ветку после мержа (GitHub предложит автоматически)

### Релиз в прод:
\`\`\`bash
git checkout main
git merge develop
git tag -a v1.2.0 -m "Release 1.2.0: Telegram retry + Admin UI fixes"
git push origin main --tags
\`\`\`

На GitHub зайдите в **Releases** → **Draft a new release** → выберите тег → опубликуйте.

---

## 🎉 Готово!

Теперь у вас:
- ✅ Репозиторий на GitHub
- ✅ Защищённые ветки \`main\` и \`develop\`
- ✅ Модульные лейблы
- ✅ Шаблоны для PR
- ✅ CI/CD (опционально)
- ✅ Процесс для разработчиков

Если что-то непонятно — пишите в issue или обращайтесь к документации проекта.
