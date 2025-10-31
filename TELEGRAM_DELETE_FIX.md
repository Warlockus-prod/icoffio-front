# ИСПРАВЛЕНИЕ ОШИБКИ УДАЛЕНИЯ СТАТЕЙ В TELEGRAM BOT

## 🐛 Проблема

При использовании команды `/delete` в Telegram боте возникали следующие ошибки:

1. **Дублирование запросов**: Telegram отправляет два webhook'а для одного сообщения (обычное сообщение и `edited_message`)
2. **Ошибка "Задание не найдено"**: Второй webhook обрабатывался как обычный URL и добавлялся в очередь
3. **Неправильный порядок сообщений**: Пользователь получал сообщения в неправильном порядке

### Пример ошибки:
```
/delete
🗑️ Удаление статьи
Отправьте ссылку...

https://app.icoffio.com/en/article/article-from-spidersweb-pl-pl

❌ Ошибка - Задание не найдено
🔄 URL получен! ... job_id ...
```

## ✅ Решение

### 1. Игнорирование `edited_message` (webhook/route.ts)

**До:**
```typescript
const message = body.message || body.edited_message;
```

**После:**
```typescript
const message = body.message; // Only process new messages, not edits
```

**Причина**: Telegram иногда отправляет два webhook'а для одного сообщения. Обрабатываем только новые сообщения.

### 2. Защита от дубликатов (telegram-compose-state.ts)

Добавлены новые функции:

```typescript
// Track recently processed delete requests
const recentDeleteRequests = new Map<string, number>();

export function wasRecentlyProcessed(chatId: number, url: string): boolean
export function markAsProcessed(chatId: number, url: string): void
```

**Механизм**:
- При обработке запроса на удаление, URL помечается как "обработанный" на 10 секунд
- Если приходит дублирующий запрос в течение 10 секунд - он игнорируется
- Автоматическая очистка через 30 секунд

### 3. Улучшенный поиск статей (delete-article/route.ts)

**Новые возможности**:
- Поиск по альтернативным slug'ам (с/без языкового суффикса)
- Расширенное логирование
- Более информативные сообщения об ошибках

**Пример**:
```typescript
// Пробуем найти статью с альтернативными вариантами slug:
// - article-from-spidersweb-pl-pl
// - article-from-spidersweb-pl
// - article-from-spidersweb
// - article-from-spidersweb-pl-pl-en
// - article-from-spidersweb-pl-pl-pl
```

### 4. Обновлённая логика обработки (webhook/route.ts)

```typescript
if (isInDeleteMode(chatId)) {
  // Check if this delete request was recently processed (prevent duplicates)
  if (wasRecentlyProcessed(chatId, text)) {
    console.log(`[Webhook] Ignoring duplicate delete request`);
    return NextResponse.json({ ok: true });
  }
  
  // Mark as processed to prevent duplicates
  markAsProcessed(chatId, text);
  endDeleteMode(chatId);
  await handleDeleteArticle(chatId, text);
  return NextResponse.json({ ok: true });
}
```

## 📊 Результат

### Было:
1. Telegram отправляет URL дважды
2. Первый запрос обрабатывается корректно
3. Второй запрос попадает в очередь как job
4. Пользователь получает ошибку "Задание не найдено"

### Стало:
1. Telegram отправляет URL дважды (это нормально)
2. Первый запрос обрабатывается корректно
3. Второй запрос игнорируется (защита от дубликатов)
4. Пользователь получает только корректное сообщение об удалении

## 🔧 Технические детали

### Файлы изменены:
1. **app/api/telegram/webhook/route.ts**
   - Игнорирование `edited_message`
   - Добавлена защита от дубликатов
   - Импорт новых функций

2. **lib/telegram-compose-state.ts**
   - Добавлен `recentDeleteRequests` Map
   - Новые функции: `wasRecentlyProcessed()`, `markAsProcessed()`
   - Автоматическая очистка через 30 секунд

3. **app/api/admin/delete-article/route.ts**
   - Улучшенная функция `findPostBySlug()`
   - Поиск по альтернативным slug'ам
   - Расширенное логирование
   - Более информативные сообщения об ошибках

### Совместимость:
- ✅ Обратная совместимость с существующим функционалом
- ✅ Не требуется изменение environment variables
- ✅ Работает с текущей версией Telegram Bot API
- ✅ Не требуется обновление зависимостей

## 🧪 Тестирование

### Тест 1: Удаление существующей статьи
```
/delete
→ https://app.icoffio.com/en/article/test-article-en
✅ Статья удалена!
```

### Тест 2: Удаление несуществующей статьи
```
/delete
→ https://app.icoffio.com/en/article/non-existent-article
❌ Ошибка удаления
Article not found in WordPress with slug: non-existent-article. It may have already been deleted.
```

### Тест 3: Дублирующие запросы (решено)
```
/delete
→ https://app.icoffio.com/en/article/test-article-en
✅ Статья удалена! (только один раз, дубликаты игнорируются)
```

## 📝 Deployment

### Production готовность:
- ✅ Код протестирован
- ✅ Линтер ошибок не обнаружил
- ✅ TypeScript компиляция успешна
- ✅ Логирование добавлено для отладки

### Команды для деплоя:
```bash
cd icoffio-clone-nextjs
npm run build
git add .
git commit -m "🐛 Fix: Telegram delete command duplicate requests and error handling"
git push origin main
```

### Vercel автоматически задеплоит изменения

## 🎯 Дальнейшие улучшения (опционально)

1. **Batch deletion**: Удаление нескольких статей одной командой
2. **Confirmation dialog**: Запрос подтверждения перед удалением
3. **Deletion history**: Хранение истории удалённых статей
4. **Rollback**: Возможность восстановления удалённых статей

## 🔗 Связанные документы

- [TELEGRAM BOT DOCUMENTATION](./N8N_INTEGRATION_GUIDE.md)
- [API DOCUMENTATION](./UNIFIED_SYSTEM_GUIDE.md)
- [DEVELOPMENT RULES](./DEVELOPMENT_RULES.md)

---

**Версия**: v4.9.1  
**Дата**: 28 октября 2025  
**Автор**: AI Assistant  
**Статус**: ✅ READY FOR PRODUCTION






