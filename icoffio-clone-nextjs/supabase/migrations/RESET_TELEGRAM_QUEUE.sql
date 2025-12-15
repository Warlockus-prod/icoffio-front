-- ============================================
-- СБРОС TELEGRAM ОЧЕРЕДИ
-- Очистка зависших задач и сброс счётчиков
-- ============================================

-- 1. Удалить все задачи из очереди
DELETE FROM telegram_jobs;

-- 2. Сбросить sequence (автоинкремент)
-- Если есть SERIAL колонки
ALTER SEQUENCE IF EXISTS telegram_jobs_id_seq RESTART WITH 1;

-- 3. Проверка
SELECT 
  'telegram_jobs' as table_name,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'processing') as processing,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM telegram_jobs;

-- Должно вернуть: total_jobs = 0

SELECT '✅ Telegram queue reset completed!' as status;

