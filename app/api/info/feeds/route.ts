import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { getFeedsForBlock } from '@/lib/info/data';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const blockId = request.nextUrl.searchParams.get('block_id');
    if (!blockId) return NextResponse.json({ error: 'block_id required' }, { status: 400 });

    const feeds = await getFeedsForBlock(Number(blockId));
    return NextResponse.json({ feeds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    // v10.11.0: title_en, title_pl, lang are optional — UI falls back to title / current locale
    const {
      block_id, title, title_en, title_pl, lang,
      feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order,
    } = body;

    if (!block_id || !title) {
      return NextResponse.json({ error: 'block_id and title required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO info_feeds (block_id, title, title_en, title_pl, lang, feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        block_id, title,
        title_en || title || null,
        title_pl || title || null,
        lang || null,
        feed_url || null, site_url || null, telegram_channel || null,
        feed_type || 'rss', icon_url || null, sort_order || 0,
      ]
    );

    return NextResponse.json({ feed: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const {
      id, title, title_en, title_pl, lang,
      feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order, is_active,
    } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE info_feeds SET
         title    = COALESCE($2, title),
         title_en = COALESCE($3, title_en),
         title_pl = COALESCE($4, title_pl),
         lang     = COALESCE($5, lang),
         feed_url = $6,
         site_url = $7,
         telegram_channel = $8,
         feed_type = COALESCE($9, feed_type),
         icon_url = $10,
         sort_order = COALESCE($11, sort_order),
         is_active = COALESCE($12, is_active)
       WHERE id = $1 RETURNING *`,
      [
        id, title, title_en, title_pl, lang,
        feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order, is_active,
      ]
    );

    return NextResponse.json({ feed: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const pool = getPool();
    await pool.query('DELETE FROM info_feeds WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
