/**
 * DELETE ARTICLE API ENDPOINT (Supabase)
 *
 * Legacy-compatible endpoint name kept for existing scripts,
 * but WordPress dependency is fully removed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/admin-auth';

export const runtime = 'edge';

interface DeleteArticleRequest {
  slug?: string;
  articleId?: number;
  locale?: 'en' | 'pl';
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
  const auth = await requireAdminRole(request, 'editor', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body: DeleteArticleRequest = await request.json();
    const { slug, articleId, locale = 'en' } = body;

    if (!slug && !articleId) {
      return NextResponse.json(
        { success: false, error: 'Either slug or articleId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    let query = supabase.from('published_articles').delete();

    if (articleId) {
      query = query.eq('id', articleId);
    } else if (slug) {
      query = query.or(`slug_en.eq.${slug},slug_pl.eq.${slug}`);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete from Supabase: ${error.message}`,
          slug,
          articleId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slug,
      articleId,
      locale,
      backend: 'supabase',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
