/**
 * BULK DELETE ARTICLES API ENDPOINT (Supabase)
 *
 * Legacy endpoint kept; WordPress dependency removed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

interface BulkDeleteRequest {
  slugs: string[];
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkDeleteRequest = await request.json();
    const { slugs } = body;

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid slugs array',
          deleted: 0,
          failed: 0,
          notFound: 0,
          results: [],
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const results: Array<{ slug: string; success: boolean; error?: string }> = [];
    let deleted = 0;
    let failed = 0;
    let notFound = 0;

    for (const slug of slugs) {
      const { data: foundRows, error: findError } = await supabase
        .from('published_articles')
        .select('id')
        .or(`slug_en.eq.${slug},slug_pl.eq.${slug}`)
        .limit(1);

      if (findError) {
        failed++;
        results.push({ slug, success: false, error: findError.message });
        continue;
      }

      const row = foundRows?.[0];
      if (!row?.id) {
        notFound++;
        results.push({ slug, success: false, error: 'Not found' });
        continue;
      }

      const { error: deleteError } = await supabase
        .from('published_articles')
        .delete()
        .eq('id', row.id);

      if (deleteError) {
        failed++;
        results.push({ slug, success: false, error: deleteError.message });
      } else {
        deleted++;
        results.push({ slug, success: true });
      }
    }

    return NextResponse.json({
      success: true,
      backend: 'supabase',
      deleted,
      failed,
      notFound,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
        deleted: 0,
        failed: 0,
        notFound: 0,
        results: [],
      },
      { status: 500 }
    );
  }
}

