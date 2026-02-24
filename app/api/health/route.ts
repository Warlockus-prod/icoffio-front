import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/pg-client';
import { getPool } from '@/lib/pg-pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'published_articles',
  'telegram_jobs',
  'telegram_user_preferences',
  'telegram_submissions',
  'article_views',
];

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        service: 'icoffio-front',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          reason: 'DATABASE_URL is missing',
        },
      },
      { status: 503 }
    );
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1');

    const tableCheck = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [REQUIRED_TABLES]
    );

    const existing = new Set((tableCheck.rows || []).map((row: any) => row.table_name));
    const missingTables = REQUIRED_TABLES.filter((tableName) => !existing.has(tableName));

    if (missingTables.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          service: 'icoffio-front',
          timestamp: new Date().toISOString(),
          database: {
            connected: true,
            missingTables,
          },
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        service: 'icoffio-front',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          reason: error?.message || 'Database check failed',
        },
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    service: 'icoffio-front',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      requiredTablesPresent: true,
    },
  });
}
