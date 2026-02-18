import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint — DISABLED in production.
 * Was used for homepage data source diagnostics.
 * To re-enable for local dev, use /api/health instead.
 */
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
