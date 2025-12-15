-- ============================================
-- TELEGRAM JOBS QUEUE TABLE
-- Migration v7.9.2 - Persistent Queue Storage
-- Date: 2025-10-30
-- ============================================

-- Создать таблицу для хранения заданий
CREATE TABLE IF NOT EXISTS telegram_jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'text-generate', 'url-parse'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  data JSONB NOT NULL, -- Job data (text, url, chatId, etc)
  result JSONB, -- Job result
  error TEXT,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_jobs_status ON telegram_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON telegram_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON telegram_jobs(created_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_telegram_jobs_updated_at BEFORE UPDATE
    ON telegram_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE telegram_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON telegram_jobs FOR ALL USING (true);

-- Комментарий
COMMENT ON TABLE telegram_jobs IS 'Очередь заданий для персистентного хранения (Queue Storage) v7.9.2';

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ
-- ============================================

-- Посмотреть все задания
-- SELECT * FROM telegram_jobs ORDER BY created_at DESC LIMIT 10;

-- Статистика очереди
-- SELECT status, COUNT(*) as count FROM telegram_jobs GROUP BY status;

-- Последние завершенные задания
-- SELECT id, type, status, data->>'chatId' as chat_id, result->>'title' as title, result->>'url' as url, created_at, completed_at
-- FROM telegram_jobs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 5;

-- Очистить старые completed jobs (старше 7 дней)
-- DELETE FROM telegram_jobs WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days';

-- Сбросить застрявшие processing jobs (старше 5 минут)
-- UPDATE telegram_jobs SET status = 'pending', retries = retries + 1 WHERE status = 'processing' AND started_at < NOW() - INTERVAL '5 minutes';

