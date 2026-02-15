/**
 * 📊 ЦЕНТРАЛИЗОВАННАЯ СИСТЕМА ЛОГИРОВАНИЯ АДМИН ПАНЕЛИ
 * Собирает все действия, ошибки и события для диагностики
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'api' | 'ui' | 'parsing' | 'translation' | 'system' | 'user';
  action: string;
  message: string;
  details?: any;
  userId?: string;
  sessionId: string;
  url?: string;
  userAgent?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogFilter {
  level?: LogEntry['level'][];
  category?: LogEntry['category'][];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

class AdminLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private isClient: boolean;
  private saveIntervalId: ReturnType<typeof setInterval> | null = null;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isClient = typeof window !== 'undefined';
    
    if (this.isClient) {
      this.loadFromStorage();
      
      // Сохраняем логи каждые 30 секунд
      this.saveIntervalId = setInterval(() => this.saveToStorage(), 30000);
      
      // Очищаем старые логи раз в час
      this.cleanupIntervalId = setInterval(() => this.cleanupOldLogs(), 3600000);
    }
  }

  /** Cleanup intervals to prevent memory leaks */
  destroy(): void {
    if (this.saveIntervalId) clearInterval(this.saveIntervalId);
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);
    if (this.isClient) this.saveToStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('icoffio_admin_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load admin logs from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('icoffio_admin_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save admin logs to storage:', error);
    }
  }

  private cleanupOldLogs(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > oneDayAgo);
    
    // Если все еще слишком много логов, удаляем самые старые
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    this.saveToStorage();
  }

  /**
   * Основной метод логирования
   */
  log(
    level: LogEntry['level'],
    category: LogEntry['category'],
    action: string,
    message: string,
    details?: any,
    error?: Error,
    duration?: number
  ): void {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      action,
      message,
      details,
      sessionId: this.sessionId,
      url: this.isClient ? window.location.href : undefined,
      userAgent: this.isClient ? navigator.userAgent : undefined,
      duration,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.logs.push(entry);
    
    // Выводим в консоль для разработки
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${level.toUpperCase()}] [${category}] ${action}:`;
      switch (level) {
        case 'error':
          console.error(prefix, message, details, error);
          break;
        case 'warn':
          console.warn(prefix, message, details);
          break;
        case 'debug':
          console.debug(prefix, message, details);
          break;
        default:
          console.log(prefix, message, details);
      }
    }

    // Автоматически сохраняем критические ошибки
    if (level === 'error') {
      this.saveToStorage();
    }
  }

  // Удобные методы для разных уровней
  info(category: LogEntry['category'], action: string, message: string, details?: any): void {
    this.log('info', category, action, message, details);
  }

  warn(category: LogEntry['category'], action: string, message: string, details?: any): void {
    this.log('warn', category, action, message, details);
  }

  error(category: LogEntry['category'], action: string, message: string, details?: any, error?: Error): void {
    this.log('error', category, action, message, details, error);
  }

  debug(category: LogEntry['category'], action: string, message: string, details?: any): void {
    this.log('debug', category, action, message, details);
  }

  // Специальные методы для частых случаев
  
  /**
   * Логирование API запросов
   */
  apiRequest(method: string, url: string, payload?: any): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.info('api', 'request_start', `${method} ${url}`, {
      requestId,
      method,
      url,
      payload: payload ? JSON.stringify(payload).substring(0, 500) : undefined
    });
    return requestId;
  }

  apiResponse(requestId: string, status: number, data?: any, duration?: number, error?: Error): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, 'api', 'request_complete', `API request ${requestId} completed with status ${status}`, {
      requestId,
      status,
      data: data ? JSON.stringify(data).substring(0, 500) : undefined
    }, error, duration);
  }

  /**
   * Логирование действий пользователя
   */
  userAction(action: string, details?: any): void {
    this.info('user', action, `User performed: ${action}`, details);
  }

  /**
   * Логирование ошибок парсинга
   */
  parsingError(url: string, error: Error, details?: any): void {
    this.error('parsing', 'parse_failed', `Failed to parse URL: ${url}`, {
      url,
      ...details
    }, error);
  }

  /**
   * Получение логов с фильтрацией
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        filtered = filtered.filter(log => filter.level!.includes(log.level));
      }

      if (filter.category && filter.category.length > 0) {
        filtered = filtered.filter(log => filter.category!.includes(log.category));
      }

      if (filter.dateFrom) {
        filtered = filtered.filter(log => log.timestamp >= filter.dateFrom!);
      }

      if (filter.dateTo) {
        filtered = filtered.filter(log => log.timestamp <= filter.dateTo!);
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.message.toLowerCase().includes(search) ||
          log.action.toLowerCase().includes(search) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(search))
        );
      }
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Получение статистики логов
   */
  getStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    byCategory: Record<LogEntry['category'], number>;
    errors24h: number;
    recentErrors: LogEntry[];
  } {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stats = {
      total: this.logs.length,
      byLevel: {
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
      } as Record<LogEntry['level'], number>,
      byCategory: {
        api: 0,
        ui: 0,
        parsing: 0,
        translation: 0,
        system: 0,
        user: 0
      } as Record<LogEntry['category'], number>,
      errors24h: 0,
      recentErrors: [] as LogEntry[]
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
      
      if (log.level === 'error') {
        if (log.timestamp > oneDayAgo) {
          stats.errors24h++;
        }
        stats.recentErrors.push(log);
      }
    });

    // Оставляем только последние 10 ошибок
    stats.recentErrors = stats.recentErrors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return stats;
  }

  /**
   * Экспорт логов в JSON
   */
  exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Очистка всех логов
   */
  clearLogs(): void {
    this.logs = [];
    if (this.isClient) {
      this.saveToStorage();
    }
    this.info('system', 'logs_cleared', 'All logs have been cleared by user');
  }

  /**
   * Мониторинг производительности
   */
  startTimer(category: LogEntry['category'], action: string): () => void {
    const start = Date.now();
    const timerId = `timer_${start}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.debug(category, 'timer_start', `Started timer for ${action}`, { timerId, action });
    
    return () => {
      const duration = Date.now() - start;
      this.log('info', category, 'timer_end', `Completed ${action} in ${duration}ms`, { 
        timerId, 
        action, 
        duration 
      }, undefined, duration);
    };
  }
}

// Глобальный экземпляр логгера
export const adminLogger = new AdminLogger();

// Хелперы для быстрого использования
export const logUserAction = (action: string, details?: any) => 
  adminLogger.userAction(action, details);

export const logApiError = (url: string, error: Error, details?: any) => 
  adminLogger.error('api', 'api_error', `API Error: ${url}`, details, error);

export const logParsingError = (url: string, error: Error, details?: any) => 
  adminLogger.parsingError(url, error, details);

export const createApiTimer = (endpoint: string) => 
  adminLogger.startTimer('api', `API: ${endpoint}`);

export const createParsingTimer = (url: string) => 
  adminLogger.startTimer('parsing', `Parse: ${url}`);
