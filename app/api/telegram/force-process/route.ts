/**
 * FORCE PROCESS QUEUE ENDPOINT
 * 
 * Принудительно запускает обработку очереди
 * Используется для обхода проблем с setTimeout в serverless
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueueService } from '@/lib/queue-service';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    console.log('[Force Process] 🚀 Starting forced queue processing...');
    
    const queueService = getQueueService();
    
    // КРИТИЧНО: Сбрасываем isProcessing флаг на случай если он застрял
    queueService.forceResetProcessing();
    
    // Запускаем обработку
    queueService.processQueue().catch(err => {
      console.error('[Force Process] Error:', err);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Queue processing triggered (isProcessing reset)'
    });
  } catch (error) {
    console.error('[Force Process] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to trigger processing' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/telegram/force-process',
    description: 'Force queue processing (serverless workaround)',
    method: 'POST'
  });
}

