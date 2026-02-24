import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { createClient, isSupabaseConfigured } from '@/lib/pg-client';
import { getPool } from '@/lib/pg-pool';

/**
 * IMAGE LIBRARY API v10.3.0
 *
 * GET  - List / search saved images (with pagination via raw SQL)
 * POST - Save image to library (uses query builder)
 *
 * Query parameters (GET):
 *   q           - search by keywords/prompt (text search)
 *   source_type - filter by source: unsplash | dalle | upload | source
 *   category    - filter by article category: ai | apple | tech | games
 *   page        - pagination page (default 1)
 *   per_page    - items per page (default 24)
 *   sort        - sort order: recent | popular | oldest (default recent)
 */

function getDb() {
  if (!isSupabaseConfigured()) {
    throw new Error('Database not configured');
  }
  return createClient();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'viewer', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const q = params.get('q') || '';
  const sourceType = params.get('source_type') || '';
  const category = params.get('category') || '';
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const perPage = Math.min(50, Math.max(1, parseInt(params.get('per_page') || '24')));
  const sort = params.get('sort') || 'recent';

  try {
    const pool = getPool();

    // Build WHERE clauses
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (sourceType) {
      conditions.push(`source_type = $${paramIndex++}`);
      values.push(sourceType);
    }
    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (q) {
      conditions.push(`(prompt ILIKE $${paramIndex} OR alt_text ILIKE $${paramIndex})`);
      values.push(`%${q}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort
    let orderClause = 'ORDER BY created_at DESC';
    switch (sort) {
      case 'popular':
        orderClause = 'ORDER BY usage_count DESC NULLS LAST, created_at DESC';
        break;
      case 'oldest':
        orderClause = 'ORDER BY created_at ASC';
        break;
    }

    // Count total
    const countSql = `SELECT COUNT(*)::int as total FROM telegram_image_library ${whereClause}`;
    const countResult = await pool.query(countSql, values);
    const total = countResult.rows[0]?.total || 0;

    // Fetch page
    const offset = (page - 1) * perPage;
    const dataSql = `SELECT * FROM telegram_image_library ${whereClause} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const dataResult = await pool.query(dataSql, [...values, perPage, offset]);
    const images = dataResult.rows || [];

    return NextResponse.json({
      success: true,
      images,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error('[ImageLibrary API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'editor', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      image_url,
      thumbnail_url,
      prompt,
      category,
      keywords,
      source_type,
      alt_text,
      author,
      article_id,
    } = body;

    if (!image_url) {
      return NextResponse.json({ success: false, error: 'image_url is required' }, { status: 400 });
    }

    const db = getDb();

    // Check for duplicate URL
    const { data: existing } = await db
      .from('telegram_image_library')
      .select('id, usage_count')
      .eq('image_url', image_url)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update usage count for existing image
      const entry = existing[0];
      await db
        .from('telegram_image_library')
        .update({
          usage_count: (entry.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      return NextResponse.json({
        success: true,
        image: { ...entry, usage_count: (entry.usage_count || 0) + 1 },
        action: 'updated',
      });
    }

    // Insert new image
    const insertData: Record<string, any> = {
      image_url,
      thumbnail_url: thumbnail_url || null,
      prompt: prompt || 'Untitled image',
      category: category || null,
      keywords: keywords || [],
      source_type: source_type || 'unknown',
      alt_text: alt_text || null,
      author: author || null,
      article_id: article_id || null,
      usage_count: 1,
      last_used_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from('telegram_image_library')
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(error.message || 'Failed to save image');
    }

    console.log(`[ImageLibrary API] Saved image: ${image_url.substring(0, 60)}... (${source_type})`);

    return NextResponse.json({
      success: true,
      image: data?.[0] || insertData,
      action: 'created',
    });
  } catch (error) {
    console.error('[ImageLibrary API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save image' },
      { status: 500 }
    );
  }
}
