/**
 * TELEGRAM WEBHOOK (COMPATIBILITY LAYER)
 *
 * Legacy endpoint kept for existing webhook URLs and reset scripts.
 * All requests are delegated to /api/telegram-simple/webhook.
 */

import { NextRequest } from 'next/server';
import {
  GET as simpleWebhookGet,
  POST as simpleWebhookPost,
} from '@/app/api/telegram-simple/webhook/route';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return simpleWebhookPost(request);
}

export async function GET() {
  const response = await simpleWebhookGet();
  return response;
}

