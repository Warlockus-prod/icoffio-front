import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  clearServerLogs,
  readServerLogs,
  type ServerLogCategory,
  type ServerLogLevel,
} from '@/lib/server-log-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function validateToken(token: string | undefined): boolean {
  if (!token || !token.startsWith('icoffio_')) return false;
  const parts = token.split('_');
  if (parts.length < 2) return false;

  const timestamp = parseInt(parts[1], 36);
  if (!Number.isFinite(timestamp)) return false;

  const now = Date.now();
  const expirationMs = 24 * 60 * 60 * 1000;
  return now - timestamp < expirationMs;
}

function isAdminAuthenticated(): boolean {
  const cookieToken = cookies().get('admin_token')?.value;
  return validateToken(cookieToken);
}

const ALLOWED_LEVELS: ServerLogLevel[] = ['debug', 'info', 'warn', 'error'];
const ALLOWED_CATEGORIES: ServerLogCategory[] = ['parser', 'queue', 'api', 'system', 'telegram'];

function normalizeLevel(value: string | null): ServerLogLevel | undefined {
  if (!value) return undefined;
  return ALLOWED_LEVELS.includes(value as ServerLogLevel) ? (value as ServerLogLevel) : undefined;
}

function normalizeCategory(value: string | null): ServerLogCategory | undefined {
  if (!value) return undefined;
  return ALLOWED_CATEGORIES.includes(value as ServerLogCategory)
    ? (value as ServerLogCategory)
    : undefined;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '200');
  const level = normalizeLevel(searchParams.get('level'));
  const category = normalizeCategory(searchParams.get('category'));
  const search = (searchParams.get('search') || '').trim() || undefined;
  const from = (searchParams.get('from') || '').trim() || undefined;
  const to = (searchParams.get('to') || '').trim() || undefined;

  const logs = await readServerLogs({ limit, level, category, search, from, to });

  return NextResponse.json({
    success: true,
    logs,
    count: logs.length,
  });
}

export async function DELETE() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await clearServerLogs();
  return NextResponse.json({ success: true, message: 'System logs cleared' });
}

