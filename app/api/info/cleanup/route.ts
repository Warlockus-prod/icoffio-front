import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

/** Allow VPS cron (Bearer INFO_FETCH_SECRET / CRON_SECRET) in addition to admin users. */
function isCronRequest(request: NextRequest): boolean {
  const secret = (process.env.INFO_FETCH_SECRET || process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return bearer === secret;
}

export async function POST(request: NextRequest) {
  if (!isCronRequest(request)) {
    const denied = await requireInfoAdmin(request);
    if (denied) return denied;
  }
  try {
    const pool = getPool();

    // Get retention setting
    const { rows: settingsRows } = await pool.query(
      "SELECT value FROM info_settings WHERE key = 'retention_days'"
    );
    const retentionDays = settingsRows.length > 0 ? parseInt(settingsRows[0].value) : 30;

    // Delete old items
    const { rowCount } = await pool.query(
      `DELETE FROM info_feed_items
       WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays]
    );

    return NextResponse.json({
      ok: true,
      deleted: rowCount,
      retention_days: retentionDays,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
