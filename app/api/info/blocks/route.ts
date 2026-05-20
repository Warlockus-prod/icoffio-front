import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { getBlocksForBoard } from '@/lib/info/data';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const boardId = request.nextUrl.searchParams.get('board_id');
    if (!boardId) return NextResponse.json({ error: 'board_id required' }, { status: 400 });

    const blocks = await getBlocksForBoard(Number(boardId));
    return NextResponse.json({ blocks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    // v10.13.0: per-locale titles
    const { board_id, title, title_en, title_pl, layout, sort_order } = body;

    if (!board_id || !title) {
      return NextResponse.json({ error: 'board_id and title required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO info_blocks (board_id, title, title_en, title_pl, layout, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [board_id, title, title_en || title, title_pl || title, layout || 'full', sort_order || 0]
    );

    return NextResponse.json({ block: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireInfoAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id, title, title_en, title_pl, layout, sort_order, is_active } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE info_blocks SET
         title      = COALESCE($2, title),
         title_en   = COALESCE($3, title_en),
         title_pl   = COALESCE($4, title_pl),
         layout     = COALESCE($5, layout),
         sort_order = COALESCE($6, sort_order),
         is_active  = COALESCE($7, is_active)
       WHERE id = $1 RETURNING *`,
      [id, title, title_en, title_pl, layout, sort_order, is_active]
    );

    return NextResponse.json({ block: rows[0] });
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
    await pool.query('DELETE FROM info_blocks WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
