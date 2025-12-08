/**
 * 🔍 SYSTEM LOGGER SERVICE v8.6.0
 * 
 * Централизованное логирование для диагностики ошибок
 * Логи сохраняются в Supabase таблицу system_logs
 * 
 * Использование:
 * ```
 * import { systemLogger } from '@/lib/system-logger';
 * 
 * // Информационный лог
 * systemLogger.info('api', 'parse_url', 'Started parsing', { url });
 * 
 * // Предупреждение
 * systemLogger.warn('telegram', 'webhook', 'Slow response', { duration: 5000 });
 * 
 * // Ошибка
 * systemLogger.error('api', 'publish', 'Failed to publish', { error: err.message }, err.stack);
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Типы
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogSource = 'api' | 'telegram' | 'admin' | 'frontend' | 'system';

export interface SystemLog {
  id?: string;
  created_at?: string;
  level: LogLevel;
  source: LogSource;
  action?: string;
  message: string;
  metadata?: Record<string, any>;
  request_id?: string;
  stack_trace?: string;
  user_name?: string;
  endpoint?: string;
  duration_ms?: number;
}

export interface LogQueryOptions {
  level?: LogLevel | LogLevel[];
  source?: LogSource | LogSource[];
  action?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  requestId?: string;
}

// Генератор уникального request_id
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Создаём Supabase клиент для логирования
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ SystemLogger: Supabase credentials not found, logging to console only');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

class SystemLogger {
  private supabase: SupabaseClient | null = null;
  private isInitialized = false;
  private pendingLogs: SystemLog[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    // Ленивая инициализация - создаём клиент при первом использовании
  }
  
  private init() {
    if (this.isInitialized) return;
    this.supabase = getSupabaseClient();
    this.isInitialized = true;
  }
  
  /**
   * Записать лог в Supabase
   */
  private async writeLog(log: SystemLog): Promise<void> {
    this.init();
    
    // Всегда логируем в консоль для Vercel logs
    const emoji = this.getLevelEmoji(log.level);
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`${emoji} [${timestamp}] [${log.source}] ${log.action || ''}: ${log.message}`, 
      log.metadata ? JSON.stringify(log.metadata) : '');
    
    if (log.stack_trace) {
      console.log('Stack:', log.stack_trace.substring(0, 500));
    }
    
    // Записываем в Supabase
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('system_logs')
          .insert({
            level: log.level,
            source: log.source,
            action: log.action,
            message: log.message,
            metadata: log.metadata || {},
            request_id: log.request_id,
            stack_trace: log.stack_trace,
            user_name: log.user_name,
            endpoint: log.endpoint,
            duration_ms: log.duration_ms
          });
        
        if (error) {
          console.error('❌ SystemLogger: Failed to write log to Supabase:', error.message);
        }
      } catch (err) {
        console.error('❌ SystemLogger: Exception writing log:', err);
      }
    }
  }
  
  /**
   * Батч-запись логов (для оптимизации)
   */
  private async flushLogs(): Promise<void> {
    if (this.pendingLogs.length === 0) return;
    
    this.init();
    
    const logsToWrite = [...this.pendingLogs];
    this.pendingLogs = [];
    
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('system_logs')
          .insert(logsToWrite.map(log => ({
            level: log.level,
            source: log.source,
            action: log.action,
            message: log.message,
            metadata: log.metadata || {},
            request_id: log.request_id,
            stack_trace: log.stack_trace,
            user_name: log.user_name,
            endpoint: log.endpoint,
            duration_ms: log.duration_ms
          })));
        
        if (error) {
          console.error('❌ SystemLogger: Failed to batch write logs:', error.message);
        }
      } catch (err) {
        console.error('❌ SystemLogger: Exception in batch write:', err);
      }
    }
  }
  
  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🟢';
      case 'debug': return '⚪';
      default: return '⚪';
    }
  }
  
  // =====================================================
  // PUBLIC API
  // =====================================================
  
  /**
   * 🔴 Логирование ошибки
   */
  async error(
    source: LogSource,
    action: string,
    message: string,
    metadata?: Record<string, any>,
    stackTrace?: string
  ): Promise<void> {
    await this.writeLog({
      level: 'error',
      source,
      action,
      message,
      metadata,
      stack_trace: stackTrace
    });
  }
  
  /**
   * 🟡 Логирование предупреждения
   */
  async warn(
    source: LogSource,
    action: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.writeLog({
      level: 'warn',
      source,
      action,
      message,
      metadata
    });
  }
  
  /**
   * 🟢 Информационный лог
   */
  async info(
    source: LogSource,
    action: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.writeLog({
      level: 'info',
      source,
      action,
      message,
      metadata
    });
  }
  
  /**
   * ⚪ Debug лог (только в development)
   */
  async debug(
    source: LogSource,
    action: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Debug логи только в development
    if (process.env.NODE_ENV === 'production') {
      // В production только в консоль, не в БД
      const timestamp = new Date().toISOString().substring(11, 19);
      console.log(`⚪ [${timestamp}] [${source}] ${action}: ${message}`, metadata || '');
      return;
    }
    
    await this.writeLog({
      level: 'debug',
      source,
      action,
      message,
      metadata
    });
  }
  
  /**
   * 📊 Расширенный лог с полным контекстом
   */
  async log(log: Omit<SystemLog, 'id' | 'created_at'>): Promise<void> {
    await this.writeLog(log as SystemLog);
  }
  
  /**
   * ⏱️ Создать таймер для измерения длительности операции
   */
  startTimer(source: LogSource, action: string, message: string, metadata?: Record<string, any>) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Логируем начало операции
    this.info(source, action, `[START] ${message}`, { ...metadata, requestId });
    
    return {
      requestId,
      
      // Завершить с успехом
      success: async (endMessage?: string, endMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        await this.info(source, action, `[END] ${endMessage || message}`, {
          ...metadata,
          ...endMetadata,
          requestId,
          duration_ms: duration
        });
        return duration;
      },
      
      // Завершить с предупреждением
      warn: async (warnMessage: string, warnMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        await this.warn(source, action, warnMessage, {
          ...metadata,
          ...warnMetadata,
          requestId,
          duration_ms: duration
        });
        return duration;
      },
      
      // Завершить с ошибкой
      error: async (errorMessage: string, errorMetadata?: Record<string, any>, stack?: string) => {
        const duration = Date.now() - startTime;
        await this.error(source, action, errorMessage, {
          ...metadata,
          ...errorMetadata,
          requestId,
          duration_ms: duration
        }, stack);
        return duration;
      }
    };
  }
  
  /**
   * 📥 Получить логи из базы данных
   */
  async getLogs(options: LogQueryOptions = {}): Promise<{ logs: SystemLog[]; total: number }> {
    this.init();
    
    if (!this.supabase) {
      return { logs: [], total: 0 };
    }
    
    try {
      let query = this.supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Фильтр по уровню
      if (options.level) {
        if (Array.isArray(options.level)) {
          query = query.in('level', options.level);
        } else {
          query = query.eq('level', options.level);
        }
      }
      
      // Фильтр по источнику
      if (options.source) {
        if (Array.isArray(options.source)) {
          query = query.in('source', options.source);
        } else {
          query = query.eq('source', options.source);
        }
      }
      
      // Фильтр по действию
      if (options.action) {
        query = query.eq('action', options.action);
      }
      
      // Поиск по сообщению
      if (options.search) {
        query = query.ilike('message', `%${options.search}%`);
      }
      
      // Фильтр по request_id
      if (options.requestId) {
        query = query.eq('request_id', options.requestId);
      }
      
      // Фильтр по дате
      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }
      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }
      
      // Пагинация
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('❌ SystemLogger: Failed to fetch logs:', error.message);
        return { logs: [], total: 0 };
      }
      
      return { logs: data || [], total: count || 0 };
    } catch (err) {
      console.error('❌ SystemLogger: Exception fetching logs:', err);
      return { logs: [], total: 0 };
    }
  }
  
  /**
   * 📊 Получить статистику логов
   */
  async getStats(hours: number = 24): Promise<{
    total: number;
    byLevel: Record<LogLevel, number>;
    bySource: Record<string, number>;
    byAction: Record<string, number>;
  }> {
    this.init();
    
    if (!this.supabase) {
      return { total: 0, byLevel: {} as any, bySource: {}, byAction: {} };
    }
    
    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('system_logs')
        .select('level, source, action')
        .gte('created_at', startDate.toISOString());
      
      if (error || !data) {
        return { total: 0, byLevel: {} as any, bySource: {}, byAction: {} };
      }
      
      const stats = {
        total: data.length,
        byLevel: { error: 0, warn: 0, info: 0, debug: 0 } as Record<LogLevel, number>,
        bySource: {} as Record<string, number>,
        byAction: {} as Record<string, number>
      };
      
      data.forEach(log => {
        // По уровню
        if (log.level) {
          stats.byLevel[log.level as LogLevel] = (stats.byLevel[log.level as LogLevel] || 0) + 1;
        }
        
        // По источнику
        if (log.source) {
          stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
        }
        
        // По действию
        if (log.action) {
          stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        }
      });
      
      return stats;
    } catch (err) {
      console.error('❌ SystemLogger: Exception getting stats:', err);
      return { total: 0, byLevel: {} as any, bySource: {}, byAction: {} };
    }
  }
  
  /**
   * 🗑️ Очистить старые логи
   */
  async cleanup(daysToKeep: number = 30): Promise<number> {
    this.init();
    
    if (!this.supabase) {
      return 0;
    }
    
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('system_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
      
      if (error) {
        console.error('❌ SystemLogger: Failed to cleanup logs:', error.message);
        return 0;
      }
      
      const deletedCount = data?.length || 0;
      console.log(`🧹 SystemLogger: Cleaned up ${deletedCount} old logs`);
      return deletedCount;
    } catch (err) {
      console.error('❌ SystemLogger: Exception during cleanup:', err);
      return 0;
    }
  }
}

// Singleton экземпляр
export const systemLogger = new SystemLogger();

// Экспорт для использования
export default systemLogger;

