import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export async function GET() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'SELECT * FROM info_watch_topics ORDER BY sort_order, created_at'
    );
    return NextResponse.json({ topics: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  try {
    const body = await req.json();
    const { name, keywords, topic_type, search_langs, sort_order, extra_sources } = body;

    if (!name || !keywords?.length) {
      return NextResponse.json({ error: 'name and keywords required' }, { status: 400 });
    }

    const { rows: [topic] } = await pool.query(
      `INSERT INTO info_watch_topics (name, keywords, topic_type, search_langs, extra_sources, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name,
        keywords,
        topic_type || 'trend',
        search_langs || ['en'],
        extra_sources || [],
        sort_order || 0,
      ]
    );

    return NextResponse.json({ topic });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const pool = getPool();
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const fields: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (['name', 'keywords', 'topic_type', 'search_langs', 'extra_sources', 'is_active', 'sort_order', 'report_days'].includes(key)) {
        fields.push(`${key} = $${paramIdx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows: [topic] } = await pool.query(
      `UPDATE info_watch_topics SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    return NextResponse.json({ topic });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await pool.query('DELETE FROM info_watch_topics WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
