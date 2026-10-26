/**
 * Admin: per-place ad accounting from the site's own beacon (table ad_slot_daily).
 *
 *   GET /api/admin/ad-stats?days=14
 *
 * Returns per-day rows and per-place totals. Auth: editor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { getPool } from '@/lib/pg-pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'editor');
  if (!auth.ok) return auth.response;

  const daysRaw = parseInt(request.nextUrl.searchParams.get('days') || '14', 10);
  const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 14, 1), 90);

  try {
    const pool = getPool();
    const [daily, totals] = await Promise.all([
      pool.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS day, SUM(filled)::int AS filled, SUM(empty)::int AS empty
           FROM ad_slot_daily
          WHERE day >= (NOW() AT TIME ZONE 'Europe/Warsaw')::date - $1::int
          GROUP BY day ORDER BY day DESC`,
        [days - 1]
      ),
      pool.query(
        `SELECT place_id, MAX(format) AS format, device, host,
                SUM(filled)::int AS filled, SUM(empty)::int AS empty,
                to_char(MAX(day) FILTER (WHERE filled > 0), 'YYYY-MM-DD') AS last_filled
           FROM ad_slot_daily
          WHERE day >= (NOW() AT TIME ZONE 'Europe/Warsaw')::date - $1::int
          GROUP BY place_id, device, host
          ORDER BY SUM(filled) DESC, SUM(empty) DESC`,
        [days - 1]
      ),
    ]);
    return NextResponse.json({ success: true, days, daily: daily.rows, places: totals.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database error';
    // A missing table means the migration has not been applied yet — say so plainly.
    const missing = /ad_slot_daily/.test(message) && /does not exist/.test(message);
    return NextResponse.json(
      { success: false, error: missing ? 'Table ad_slot_daily is missing — apply supabase/migrations/20261026_ad_slot_daily.sql' : message },
      { status: missing ? 503 : 500 }
    );
  }
}
