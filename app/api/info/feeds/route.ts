import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { getFeedsForBlock } from '@/lib/info/data';

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
  try {
    const body = await request.json();
    const { block_id, title, feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order } = body;

    if (!block_id || !title) {
      return NextResponse.json({ error: 'block_id and title required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO info_feeds (block_id, title, feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [block_id, title, feed_url || null, site_url || null, telegram_channel || null, feed_type || 'rss', icon_url || null, sort_order || 0]
    );

    return NextResponse.json({ feed: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order, is_active } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE info_feeds SET
         title = COALESCE($2, title),
         feed_url = $3,
         site_url = $4,
         telegram_channel = $5,
         feed_type = COALESCE($6, feed_type),
         icon_url = $7,
         sort_order = COALESCE($8, sort_order),
         is_active = COALESCE($9, is_active)
       WHERE id = $1 RETURNING *`,
      [id, title, feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order, is_active]
    );

    return NextResponse.json({ feed: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
