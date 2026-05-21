/**
 * Translation QC — admin spot-check + re-translate workflow (v10.17.0).
 *
 *   GET  /api/admin/info/translation-qc?lang=pl&field=title&limit=30
 *        → recent translated items: source vs translation, side by side.
 *
 *   POST /api/admin/info/translation-qc
 *        { action: 'reset', ids: number[], field: 'title'|'description', target: 'pl'|'en' }
 *        → NULLs the chosen translation column for those items so the next
 *          translate-batch (or cron) re-does them.
 *
 * Auth: admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { getPool } from '@/lib/pg-pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMN = {
  title: { pl: 'title_pl', en: 'title_en', src: 'title' },
  description: { pl: 'description_pl', en: 'description_en', src: 'description' },
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  try {
    const url = request.nextUrl;
    const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'pl';
    const field = url.searchParams.get('field') === 'description' ? 'description' : 'title';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10), 1), 100);
    const cfg = COLUMN[field];

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT i.id,
              i.${cfg.src}  AS source,
              i.${cfg[lang]} AS translated,
              f.title       AS feed_title,
              i.published_at
         FROM info_feed_items i
         JOIN info_feeds f ON f.id = i.feed_id
        WHERE i.${cfg[lang]} IS NOT NULL AND i.${cfg[lang]} <> ''
        ORDER BY i.id DESC
        LIMIT $1`,
      [limit],
    );

    // Flag suspicious rows: translation identical to source (possible lazy echo
    // that slipped through), or wildly different length.
    const entries = rows.map((r) => {
      const src = (r.source || '').trim();
      const tr = (r.translated || '').trim();
      const identical = src === tr;
      const lenRatio = src.length ? tr.length / src.length : 1;
      const suspicious = identical || lenRatio < 0.4 || lenRatio > 2.5;
      return { ...r, identical, suspicious };
    });

    return NextResponse.json({
      ok: true,
      lang,
      field,
      count: entries.length,
      suspiciousCount: entries.filter((e) => e.suspicious).length,
      entries,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const action = body.action;
    if (action !== 'reset') {
      return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
    }

    const ids: number[] = Array.isArray(body.ids)
      ? body.ids.map((x: any) => parseInt(x, 10)).filter((n: number) => Number.isFinite(n))
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'ids required' }, { status: 400 });
    }
    if (ids.length > 500) {
      return NextResponse.json({ ok: false, error: 'too many ids (max 500)' }, { status: 400 });
    }

    const field = body.field === 'description' ? 'description' : 'title';
    const target = body.target === 'en' ? 'en' : 'pl';
    const column = COLUMN[field][target];

    const pool = getPool();
    const { rowCount } = await pool.query(
      `UPDATE info_feed_items SET ${column} = NULL WHERE id = ANY($1::int[])`,
      [ids],
    );

    return NextResponse.json({ ok: true, reset: rowCount, column });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
