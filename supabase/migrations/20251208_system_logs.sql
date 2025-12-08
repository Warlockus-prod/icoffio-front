-- =====================================================
-- SYSTEM LOGS TABLE - v8.6.0
-- Централизованное логирование для диагностики ошибок
-- Created: 2025-12-08
-- =====================================================

-- Создаём таблицу для системных логов
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уровень логирования: error, warn, info, debug
  level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  
  -- Источник лога: api, telegram, admin, frontend, system
  source VARCHAR(50) NOT NULL,
  
  -- Конкретное действие: parse_url, publish_article, translate, etc.
  action VARCHAR(100),
  
  -- Основное сообщение
  message TEXT NOT NULL,
  
  -- Дополнительные данные в JSON формате
  metadata JSONB DEFAULT '{}',
  
  -- ID запроса для трейсинга (связывает несколько логов одного запроса)
  request_id VARCHAR(50),
  
  -- Stack trace для ошибок
  stack_trace TEXT,
  
  -- Имя пользователя (если известно)
  user_name VARCHAR(100),
  
  -- URL/endpoint где произошло событие
  endpoint VARCHAR(255),
  
  -- Время выполнения операции (в миллисекундах)
  duration_ms INTEGER
);

-- =====================================================
-- ИНДЕКСЫ для быстрого поиска
-- =====================================================

-- По уровню (для фильтрации errors)
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

-- По источнику (для фильтрации по telegram/api/admin)
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);

-- По времени (для сортировки и очистки старых)
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- По действию (для фильтрации конкретных операций)
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);

-- По request_id (для трейсинга)
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);

-- Составной индекс для типичных запросов
CREATE INDEX IF NOT EXISTS idx_system_logs_level_source_created 
ON system_logs(level, source, created_at DESC);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Включаем RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Политика: сервис может всё
CREATE POLICY "Service can manage all logs" ON system_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ФУНКЦИЯ для автоматической очистки старых логов
-- Хранить логи 30 дней
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM system_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- КОММЕНТАРИИ к таблице
-- =====================================================

COMMENT ON TABLE system_logs IS 'Централизованные системные логи для диагностики ошибок и мониторинга';
COMMENT ON COLUMN system_logs.level IS 'Уровень: error (критические), warn (предупреждения), info (информация), debug (отладка)';
COMMENT ON COLUMN system_logs.source IS 'Источник: api, telegram, admin, frontend, system';
COMMENT ON COLUMN system_logs.action IS 'Конкретное действие: parse_url, publish_article, translate, generate_image, etc.';
COMMENT ON COLUMN system_logs.metadata IS 'JSON с дополнительными данными (url, articleId, error details, etc.)';
COMMENT ON COLUMN system_logs.request_id IS 'UUID для связи нескольких логов одного запроса';
COMMENT ON COLUMN system_logs.duration_ms IS 'Время выполнения операции в миллисекундах';

