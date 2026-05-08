import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

export async function POST(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
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
