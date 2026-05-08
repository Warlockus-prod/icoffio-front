/**
 * Web Vitals beacon endpoint — captures real-user metrics from <WebVitals />.
 *
 *   POST /api/analytics/web-vitals
 *   Body: { name, value, id, rating?, path?, viewport?, connection? }
 *
 * Public — no auth (called from every page render). Rate-limited via PUBLIC_API.
 * Never blocks page render: failures are silent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { checkRateLimit } from '@/lib/api-rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_METRICS = new Set(['LCP', 'CLS', 'INP', 'FCP', 'TTFB', 'FID']);
const VALID_RATINGS = new Set(['good', 'needs-improvement', 'poor']);

interface VitalsBody {
  name?: string;
  value?: number;
  id?: string;
  rating?: string;
  path?: string;
  viewport?: { w?: number; h?: number };
  connection?: string;
}

export async function POST(request: NextRequest) {
  // Rate-limit (defends against abusive clients flooding the table)
  const rl = checkRateLimit(request, 'PUBLIC_API');
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: VitalsBody;
  try {
    body = (await request.json()) as VitalsBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name : '';
  const value = typeof body.value === 'number' ? body.value : NaN;
  if (!VALID_METRICS.has(name) || !Number.isFinite(value)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (value < 0 || value > 600_000) {
    // Sanity bounds: max 10 minutes; reject obvious garbage
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rating = typeof body.rating === 'string' && VALID_RATINGS.has(body.rating) ? body.rating : null;
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : null;
  const viewportW = Number.isFinite(body.viewport?.w) ? Math.floor(body.viewport!.w!) : null;
  const viewportH = Number.isFinite(body.viewport?.h) ? Math.floor(body.viewport!.h!) : null;
  const connection = typeof body.connection === 'string' ? body.connection.slice(0, 20) : null;
  const metricId = typeof body.id === 'string' ? body.id.slice(0, 100) : null;

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO web_vitals
        (metric_name, metric_value, metric_id, rating, page_path, user_agent, viewport_w, viewport_h, connection)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [name, value, metricId, rating, path, userAgent || null, viewportW, viewportH, connection],
    );
  } catch {
    // Silent — never break the page over analytics
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET — admin dashboard: aggregated p75 over 24h, broken down by metric.
 */
export async function GET(request: NextRequest) {
  // For admin only — but lazy-import to avoid cyclic dep at module init
  const { requireAdminRole } = await import('@/lib/admin-auth');
  const auth = await requireAdminRole(request, 'viewer');
  if (!auth.ok) return auth.response;

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT metric_name,
              COUNT(*) AS samples,
              percentile_cont(0.5)  WITHIN GROUP (ORDER BY metric_value) AS p50,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95,
              SUM(CASE WHEN rating='good' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) AS good_share,
              SUM(CASE WHEN rating='poor' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) AS poor_share
        FROM web_vitals
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY metric_name
       ORDER BY metric_name`,
    );
    return NextResponse.json({ ok: true, window: '24h', metrics: rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
