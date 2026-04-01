import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { getBlocksForBoard } from '@/lib/info/data';

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
  try {
    const body = await request.json();
    const { board_id, title, layout, sort_order } = body;

    if (!board_id || !title) {
      return NextResponse.json({ error: 'board_id and title required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO info_blocks (board_id, title, layout, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [board_id, title, layout || 'full', sort_order || 0]
    );

    return NextResponse.json({ block: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, layout, sort_order, is_active } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE info_blocks SET
         title = COALESCE($2, title),
         layout = COALESCE($3, layout),
         sort_order = COALESCE($4, sort_order),
         is_active = COALESCE($5, is_active)
       WHERE id = $1 RETURNING *`,
      [id, title, layout, sort_order, is_active]
    );

    return NextResponse.json({ block: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
