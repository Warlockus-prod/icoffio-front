import { NextRequest, NextResponse } from 'next/server';
import { getBoards, getBoardBySlug, getAllBoardsAdmin } from '@/lib/info/data';
import { getPool } from '@/lib/pg-pool';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const admin = request.nextUrl.searchParams.get('admin');

    if (slug) {
      const board = await getBoardBySlug(slug);
      return NextResponse.json({ board });
    }

    // ?admin=1 returns inactive boards too — gate behind admin auth
    if (admin === '1') {
      const denied = await requireInfoAdmin(request);
      if (denied) return denied;
      const boards = await getAllBoardsAdmin();
      return NextResponse.json({ boards });
    }

    const boards = await getBoards();
    return NextResponse.json({ boards });
  } catch (error: any) {
    console.error('[API info/boards] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    // v10.13.0: per-locale titles + subtitles
    const {
      title, title_en, title_pl,
      slug, subtitle, subtitle_en, subtitle_pl,
      icon_url, sort_order, is_active,
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO info_boards (title, title_en, title_pl, slug, subtitle, subtitle_en, subtitle_pl, icon_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title, title_en || title, title_pl || title,
        slug, subtitle || null, subtitle_en || subtitle || null, subtitle_pl || subtitle || null,
        icon_url || null, sort_order || 0, is_active !== false,
      ]
    );

    return NextResponse.json({ board: rows[0] });
  } catch (error: any) {
    console.error('[API info/boards] POST Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const {
      id, title, title_en, title_pl,
      slug, subtitle, subtitle_en, subtitle_pl,
      icon_url, sort_order, is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE info_boards SET
         title       = COALESCE($2, title),
         title_en    = COALESCE($3, title_en),
         title_pl    = COALESCE($4, title_pl),
         slug        = COALESCE($5, slug),
         subtitle    = $6,
         subtitle_en = COALESCE($7, subtitle_en),
         subtitle_pl = COALESCE($8, subtitle_pl),
         icon_url    = $9,
         sort_order  = COALESCE($10, sort_order),
         is_active   = COALESCE($11, is_active),
         updated_at  = NOW()
       WHERE id = $1 RETURNING *`,
      [
        id, title, title_en, title_pl,
        slug, subtitle, subtitle_en, subtitle_pl,
        icon_url, sort_order, is_active,
      ]
    );

    return NextResponse.json({ board: rows[0] });
  } catch (error: any) {
    console.error('[API info/boards] PUT Error:', error.message);
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
    await pool.query('DELETE FROM info_boards WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
