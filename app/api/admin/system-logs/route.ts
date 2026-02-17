import { NextRequest, NextResponse } from 'next/server';
import {
  clearServerLogs,
  readServerLogs,
  type ServerLogCategory,
  type ServerLogLevel,
} from '@/lib/server-log-store';
import { requireAdminRole } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

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

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  await clearServerLogs();
  return NextResponse.json({ success: true, message: 'System logs cleared' });
}
