/**
 * 📊 SYSTEM LOGS API v8.6.0
 * 
 * API для чтения и записи системных логов
 * 
 * GET /api/system-logs - получить логи с фильтрами
 * POST /api/system-logs - записать новый лог
 * DELETE /api/system-logs - очистить старые логи
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemLogger, LogLevel, LogSource } from '@/lib/system-logger';

// GET - Получить логи
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Парсим параметры
    const level = searchParams.get('level') as LogLevel | null;
    const source = searchParams.get('source') as LogSource | null;
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const requestId = searchParams.get('requestId');
    const hours = parseInt(searchParams.get('hours') || '24');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Специальный режим - статистика
    if (searchParams.get('stats') === 'true') {
      const stats = await systemLogger.getStats(hours);
      return NextResponse.json({
        success: true,
        stats,
        period: `${hours} hours`
      });
    }
    
    // Получаем логи
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const { logs, total } = await systemLogger.getLogs({
      level: level || undefined,
      source: source || undefined,
      action: action || undefined,
      search: search || undefined,
      requestId: requestId || undefined,
      startDate,
      limit,
      offset
    });
    
    return NextResponse.json({
      success: true,
      logs,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + logs.length < total
      }
    });
    
  } catch (error) {
    console.error('❌ System Logs API GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

// POST - Записать новый лог
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      level = 'info',
      source = 'api',
      action,
      message,
      metadata,
      stack_trace,
      user_name,
      endpoint,
      request_id,
      duration_ms
    } = body;
    
    // Валидация
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Записываем лог
    await systemLogger.log({
      level,
      source,
      action,
      message,
      metadata,
      stack_trace,
      user_name,
      endpoint,
      request_id,
      duration_ms
    });
    
    return NextResponse.json({
      success: true,
      message: 'Log recorded'
    });
    
  } catch (error) {
    console.error('❌ System Logs API POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to write log' },
      { status: 500 }
    );
  }
}

// DELETE - Очистить старые логи
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('days') || '30');
    
    const deletedCount = await systemLogger.cleanup(daysToKeep);
    
    // Логируем само действие очистки
    await systemLogger.info('system', 'cleanup_logs', `Cleaned up ${deletedCount} old logs`, {
      daysKept: daysToKeep,
      deletedCount
    });
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} logs older than ${daysToKeep} days`,
      deletedCount
    });
    
  } catch (error) {
    console.error('❌ System Logs API DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup logs' },
      { status: 500 }
    );
  }
}

