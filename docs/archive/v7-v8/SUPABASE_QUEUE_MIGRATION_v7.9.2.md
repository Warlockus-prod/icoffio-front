# 🗄️ SUPABASE QUEUE MIGRATION v7.9.2

## 📋 Обзор

**Проблема**: Telegram бот терял задания из очереди в serverless окружении (Vercel)
**Решение**: Персистентное хранилище в Supabase для queue storage

---

## 🔧 ЧТО ИЗМЕНИЛОСЬ

### ДО v7.9.2 (Память):
```typescript
class QueueService {
  private queue: QueueJob[] = []; // ❌ Теряется между запросами
}
```

**Проблема**: Vercel использует разные workers → задания теряются

### ПОСЛЕ v7.9.2 (Supabase):
```typescript
await supabase
  .from('telegram_jobs')
  .insert({ id, type, status, data }); // ✅ Персистентно
```

**Решение**: Все задания хранятся в PostgreSQL → 100% надежность

---

## 📊 НОВАЯ ТАБЛИЦА: `telegram_jobs`

```sql
CREATE TABLE telegram_jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  data JSONB NOT NULL,
  result JSONB,
  error TEXT,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Индексы:
- `idx_jobs_status` - для быстрого поиска pending jobs
- `idx_jobs_type` - фильтрация по типу
- `idx_jobs_created` - сортировка по дате

---

## 🚀 ИНСТРУКЦИЯ ПО МИГРАЦИИ

### Шаг 1: Применить SQL миграцию

1. Открой **Supabase Dashboard**: https://app.supabase.com
2. Выбери проект `icoffio`
3. Перейди в **SQL Editor**
4. Скопируй и выполни SQL из `/supabase/schema.sql` (секция `telegram_jobs`)

### Шаг 2: Проверить environment variables

Убедись что в **Vercel** есть:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **ВАЖНО**: Используй `SUPABASE_SERVICE_ROLE_KEY` (не anon key!)

### Шаг 3: Задеплоить обновление

```bash
git add .
git commit -m "🗄️ Release v7.9.2: Supabase Queue Storage"
git tag v7.9.2
git push origin main --tags
```

Vercel автоматически задеплоит изменения.

### Шаг 4: Протестировать

1. Отправь текст в Telegram бот
2. Получишь: "📋 Добавлено в очередь: job_XXXXX"
3. Отправь: `/queue`
4. Увидишь: "📋 Всего заданий: 1" ✅
5. Подожди ~60 секунд
6. Получишь: "✅ ОПУБЛИКОВАНО! [ссылка]" ✅

---

## 🔍 ПРОВЕРКА ДАННЫХ В SUPABASE

### SQL запросы для проверки:

```sql
-- Посмотреть все задания
SELECT * FROM telegram_jobs ORDER BY created_at DESC LIMIT 10;

-- Статистика очереди
SELECT 
  status,
  COUNT(*) as count
FROM telegram_jobs
GROUP BY status;

-- Последние завершенные задания
SELECT 
  id,
  type,
  status,
  data->>'chatId' as chat_id,
  result->>'title' as title,
  result->>'url' as url,
  created_at,
  completed_at
FROM telegram_jobs
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 5;
```

---

## 📈 ПРЕИМУЩЕСТВА v7.9.2

| До (In-Memory) | После (Supabase) |
|----------------|------------------|
| ❌ Задания теряются | ✅ 100% персистентность |
| ❌ Не работает между workers | ✅ Работает везде |
| ❌ `/queue` показывает 0 | ✅ Показывает реальные данные |
| ❌ Нет истории | ✅ Полная история заданий |
| ❌ Нет мониторинга | ✅ SQL analytics |

---

## 🧪 TROUBLESHOOTING

### Проблема: "Failed to add job: relation telegram_jobs does not exist"
**Решение**: Применить SQL миграцию (Шаг 1)

### Проблема: "No API key found in request"
**Решение**: Проверить `SUPABASE_SERVICE_ROLE_KEY` в Vercel

### Проблема: Задания добавляются но не обрабатываются
**Решение**: 
1. Проверь логи Vercel Functions
2. Убедись что `processQueue()` вызывается
3. Проверь статус в Supabase: `SELECT status FROM telegram_jobs`

### Проблема: "Processing" jobs висят больше 5 минут
**Решение**:
```sql
-- Сбросить застрявшие jobs
UPDATE telegram_jobs
SET status = 'pending', retries = retries + 1
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '5 minutes';
```

---

## 🔮 БУДУЩИЕ УЛУЧШЕНИЯ

1. **Auto-cleanup** (v7.9.3):
   - Удалять completed jobs старше 7 дней
   - Cron job через Vercel или Supabase

2. **Retry Logic** (v7.9.4):
   - Exponential backoff для retry
   - Dead letter queue для failed jobs

3. **Priority Queue** (v7.9.5):
   - Поле `priority` для важных заданий
   - VIP пользователи → приоритет

4. **Real-time Updates** (v7.10.0):
   - Supabase Realtime для live tracking
   - WebSockets для мгновенных уведомлений

---

## 📚 СВЯЗАННЫЕ ФАЙЛЫ

- `/supabase/schema.sql` - SQL миграция
- `/lib/queue-service.ts` - Новая реализация QueueService
- `/app/api/telegram/webhook/route.ts` - Использование queue
- `/app/api/telegram/process-queue/route.ts` - Обработка заданий

---

## ✅ CHECKLIST

- [ ] SQL миграция применена в Supabase
- [ ] Environment variables проверены в Vercel
- [ ] Код задеплоен (v7.9.2 tag)
- [ ] Telegram бот протестирован
- [ ] `/queue` команда показывает задания
- [ ] Уведомления о публикации приходят

---

## 📞 SUPPORT

Если остались вопросы - проверь логи в:
1. **Vercel Functions**: https://vercel.com/your-project/logs
2. **Supabase Logs**: https://app.supabase.com → Project → Logs
3. **Telegram Webhook**: `/api/telegram/webhook` logs

---

**Version**: v7.9.2  
**Date**: 2025-10-30  
**Author**: Claude AI  
**Status**: ✅ Production Ready

