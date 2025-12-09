/**
 * Proxy webhook для Telegram, перенаправляет на упрощённый обработчик.
 * Это обеспечивает совместимость с ранее настроенным URL:
 * https://app.icoffio.com/api/telegram/webhook
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  POST as simplePost,
  runtime as simpleRuntime,
  maxDuration as simpleMaxDuration,
} from '../../telegram-simple/webhook/route';

export const runtime = simpleRuntime;
export const maxDuration = simpleMaxDuration;

export async function POST(request: NextRequest) {
  return simplePost(request);
}

export async function GET() {
  return NextResponse.json({
    service: 'Telegram Webhook Proxy',
    status: 'active',
    target: '/api/telegram-simple/webhook',
  });
}

