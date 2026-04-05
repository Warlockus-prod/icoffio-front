import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export async function GET(request: NextRequest) {
  try {
    const isStats = request.nextUrl.searchParams.get('stats');

    if (isStats) {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT COUNT(*) as total_items, MIN(created_at)::text as oldest FROM info_feed_items`
      );
      return NextResponse.json({ stats: rows[0] });
    }

    return NextResponse.json({ error: 'Use ?stats=1' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
