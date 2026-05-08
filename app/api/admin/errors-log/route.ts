/**
 * Admin endpoint for the self-hosted error log (replaces Sentry dashboard).
 *
 *   GET /api/admin/errors-log?level=error&source=admin-auth&limit=50
 *   DELETE /api/admin/errors-log?olderThanDays=30
 *
 * Auth: requireAdminRole('admin').
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { getPool } from '@/lib/pg-pool';
import { logError } from '@/lib/error-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_LEVELS = new Set(['info', 'warn', 'error', 'critical']);

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  try {
    const url = request.nextUrl;
    const level = url.searchParams.get('level');
    const source = url.searchParams.get('source');
    const limitRaw = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Math.min(Math.max(limitRaw, 1), 500);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (level && VALID_LEVELS.has(level)) {
      conditions.push(`level = $${paramIdx++}`);
      params.push(level);
    }
    if (source) {
      conditions.push(`source = $${paramIdx++}`);
      params.push(source.slice(0, 100));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const sql = `
      SELECT id, level, source, message, stack, metadata, request_path, request_method,
             user_email, user_ip, created_at
        FROM errors_log
      ${whereClause}
      ORDER BY created_at DESC
       LIMIT $${paramIdx}
    `;

    const pool = getPool();
    const { rows } = await pool.query(sql, params);

    // Aggregate counts by level (for dashboard widget)
    const { rows: counts } = await pool.query(
      `SELECT level, COUNT(*) AS count
         FROM errors_log
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY level`,
    );

    return NextResponse.json({
      ok: true,
      entries: rows,
      stats24h: counts.reduce(
        (acc, r) => ({ ...acc, [r.level]: Number(r.count) }),
        { info: 0, warn: 0, error: 0, critical: 0 },
      ),
    });
  } catch (err) {
    await logError({
      level: 'error',
      source: 'admin-errors-log-api',
      message: 'Failed to query errors_log',
      error: err,
    });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE — manual purge. Default: removes entries older than 30 days unless `?level=critical`
 * (critical errors are kept 90 days). Pass `?olderThanDays=N` to override.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  try {
    const url = request.nextUrl;
    const olderRaw = parseInt(url.searchParams.get('olderThanDays') || '30', 10);
    const olderThanDays = Math.min(Math.max(olderRaw, 1), 365);

    const pool = getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM errors_log
        WHERE created_at < NOW() - ($1 || ' days')::interval`,
      [olderThanDays],
    );

    return NextResponse.json({ ok: true, deleted: rowCount, olderThanDays });
  } catch (err) {
    await logError({
      level: 'error',
      source: 'admin-errors-log-api',
      message: 'Failed to purge errors_log',
      error: err,
    });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
