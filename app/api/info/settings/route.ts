import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT key, value FROM info_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = getPool();

    for (const [key, value] of Object.entries(body)) {
      await pool.query(
        `INSERT INTO info_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
