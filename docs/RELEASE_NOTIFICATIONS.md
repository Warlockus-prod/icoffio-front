# 📢 RELEASE NOTIFICATIONS GUIDE

Как настроить и использовать уведомления о релизах в Telegram

---

## 🎯 ЧТО ЭТО?

После каждого релиза (git push tag) автоматически отправляется уведомление в Telegram с:
- 📦 Номером версии
- 📝 Кратким описанием изменений
- 🔗 Ссылками на GitHub и Live сайт
- ✅ Статусом деплоя

---

## 🚀 АВТОМАТИЧЕСКАЯ НАСТРОЙКА (GitHub Actions)

### Шаг 1: Добавить Secrets в GitHub

1. Открыть: https://github.com/Warlockus-prod/icoffio-front/settings/secrets/actions
2. Нажать **"New repository secret"**
3. Добавить 2 секрета:

**Secret 1: TELEGRAM_BOT_TOKEN**
```
Name: TELEGRAM_BOT_TOKEN
Value: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
```

**Secret 2: TELEGRAM_CHAT_ID**
```
Name: TELEGRAM_CHAT_ID
Value: 123456789
```

### Шаг 2: Как получить CHAT_ID?

**Способ 1: Через бота**
```
1. Отправь /start боту @icoffio_bot
2. Отправь любое сообщение
3. Открой: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
4. Найди "chat":{"id":123456789} - это твой CHAT_ID
```

**Способ 2: Через @userinfobot**
```
1. Найди @userinfobot в Telegram
2. Отправь /start
3. Бот покажет твой ID
```

### Шаг 3: Workflow готов!

GitHub Actions workflow уже создан: `.github/workflows/release-notification.yml`

**Когда срабатывает?**
- Автоматически при push тега (v7.5.0, v7.6.0, etc.)

**Что делает?**
1. Извлекает версию из тега
2. Парсит CHANGELOG.md
3. Отправляет уведомление в Telegram
4. Всё автоматически! ✨

---

## 🖱️ РУЧНАЯ ОТПРАВКА (Scripts)

### Метод 1: Упрощенный скрипт (рекомендуется)

```bash
# Экспортировать переменные окружения
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_CHAT_ID="your_chat_id"

# Запустить скрипт (автоматически определяет версию из package.json)
./scripts/notify-release-simple.sh
```

**Что отправляет?**
- Номер версии из `package.json`
- Заголовок релиза из `CHANGELOG.md`
- Первые 5 ключевых функций
- Ссылки на сайт и GitHub

---

### Метод 2: Полный скрипт

```bash
export TELEGRAM_BOT_TOKEN="your_token"

# Указать версию и chat ID вручную
./scripts/notify-release.sh "7.5.0" "123456789"
```

**Что отправляет?**
- Полные release notes из CHANGELOG.md (первые 50 строк)
- Ссылки на commit, release, live site
- Статус деплоя

---

## 📋 WORKFLOW ДЛЯ РЕЛИЗА

### Полный процесс:

```bash
# 1. Делаешь изменения и тестируешь
npm run build
./scripts/pre-deploy.sh

# 2. Коммитишь
git add .
git commit -m "✨ MINOR: v7.6.0 - New features"

# 3. Обновляешь версию в package.json
# (вручную или через npm version)
npm version minor  # 7.5.0 → 7.6.0

# 4. Обновляешь CHANGELOG.md
# Добавь раздел для v7.6.0 с описанием изменений

# 5. Коммитишь версию
git add .
git commit -m "🔖 Release v7.6.0"

# 6. Push на GitHub
git push origin main

# 7. Создаешь и пушишь тег
git tag v7.6.0
git push origin v7.6.0

# 8. GitHub Actions автоматически:
#    ✅ Отправит уведомление в Telegram
#    ✅ Vercel задеплоит на production
```

---

## 🎨 ПРИМЕР УВЕДОМЛЕНИЯ

```
🚀 icoffio v7.5.0 Released!

MINOR RELEASE - Multi-message composition & article deletion

Key Updates:
📌 COMPOSE MODE (Multi-Message Articles)
• Compose State Management (in-memory)
• /compose - начать составление
• /publish - опубликовать накопленное
• /cancel - отменить
📌 DELETE ARTICLES
• /delete команда → delete mode
• API: /api/admin/delete-article

Links:
🌐 Live Site
📝 Release Notes
💻 Commit

✅ Deployed to Vercel
```

---

## 🔧 НАСТРОЙКА БОТА ДЛЯ УВЕДОМЛЕНИЙ

### Создать отдельный канал (опционально):

1. Создай новый канал в Telegram
2. Добавь бота как администратора
3. Получи Chat ID канала:
   ```bash
   # Отправь сообщение в канал
   # Затем:
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   # Найди "chat":{"id":-1001234567890,"type":"channel"}
   ```
4. Используй этот ID для уведомлений

### Настройки бота:

**BotFather commands:**
```
/setcommands
start - Start bot
help - Get help
compose - Compose multi-message article
publish - Publish composed
cancel - Cancel operation
delete - Delete article
queue - View queue
status - System status
language - Change language
```

---

## 🐛 TROUBLESHOOTING

### ❌ GitHub Action не срабатывает

**Проверь:**
1. Secrets добавлены в GitHub? (Settings → Secrets)
2. Workflow файл существует? (`.github/workflows/release-notification.yml`)
3. Тег правильного формата? (v7.5.0, НЕ 7.5.0)
4. Workflow enabled? (Actions → Workflows → Release Notification)

### ❌ Скрипт не отправляет

**Проверь:**
```bash
# 1. Переменные окружения
echo $TELEGRAM_BOT_TOKEN
echo $TELEGRAM_CHAT_ID

# 2. Токен валидный?
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe

# 3. Chat ID правильный?
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=Test message"
```

### ❌ Уведомление приходит, но пустое

**Причина**: Версия не найдена в CHANGELOG.md

**Решение**:
```bash
# Проверь формат в CHANGELOG:
## [7.5.0] - 2025-10-28 - TITLE

# Должен быть ТОЧНО такой формат
```

---

## 📊 СТАТИСТИКА

После каждого релиза ты будешь получать:
- ✅ Instant notification (< 30 секунд)
- 📝 Краткое описание изменений
- 🔗 Прямые ссылки
- 📱 Удобный формат для мобильного

**Удобно для:**
- Отслеживания релизов
- Информирования команды
- Ведения истории изменений
- Быстрого доступа к новым функциям

---

## 🎯 BEST PRACTICES

1. **CHANGELOG.md format**:
   ```markdown
   ## [7.5.0] - 2025-10-28 - SHORT TITLE
   
   **RELEASE TYPE** - Description
   
   ### Added
   - Feature 1
   - Feature 2
   ```

2. **Version tags**:
   - Always use `v` prefix: `v7.5.0`
   - Follow Semantic Versioning
   - Tag after CHANGELOG update

3. **Telegram setup**:
   - Use dedicated channel for releases
   - Pin important releases
   - Archive старых уведомлений

4. **Testing**:
   ```bash
   # Тестировать скрипт перед релизом
   ./scripts/notify-release-simple.sh
   ```

---

**Last Updated**: 2025-10-28  
**Version**: 7.5.0








