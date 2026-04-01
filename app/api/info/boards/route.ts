import { NextRequest, NextResponse } from 'next/server';
import { getBoards, getBoardBySlug, getAllBoardsAdmin } from '@/lib/info/data';
import { getPool } from '@/lib/pg-pool';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const admin = request.nextUrl.searchParams.get('admin');

    if (slug) {
      const board = await getBoardBySlug(slug);
      return NextResponse.json({ board });
    }

    const boards = admin === '1' ? await getAllBoardsAdmin() : await getBoards();
    return NextResponse.json({ boards });
  } catch (error: any) {
    console.error('[API info/boards] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, subtitle, icon_url, sort_order, is_active } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO info_boards (title, slug, subtitle, icon_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, slug, subtitle || null, icon_url || null, sort_order || 0, is_active !== false]
    );

    return NextResponse.json({ board: rows[0] });
  } catch (error: any) {
    console.error('[API info/boards] POST Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, slug, subtitle, icon_url, sort_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE info_boards SET
         title = COALESCE($2, title),
         slug = COALESCE($3, slug),
         subtitle = $4,
         icon_url = $5,
         sort_order = COALESCE($6, sort_order),
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, title, slug, subtitle, icon_url, sort_order, is_active]
    );

    return NextResponse.json({ board: rows[0] });
  } catch (error: any) {
    console.error('[API info/boards] PUT Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
