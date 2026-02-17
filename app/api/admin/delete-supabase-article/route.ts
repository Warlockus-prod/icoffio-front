/**
 * DELETE SUPABASE ARTICLE API ENDPOINT
 * 
 * Deletes an article from Supabase by ID
 * Used for cleaning up problematic articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/admin-auth';

export const runtime = 'edge';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface DeleteSupabaseArticleRequest {
  articleId: number;
  slug?: string;
}

interface DeleteSupabaseArticleResponse {
  success: boolean;
  articleId?: number;
  slug?: string;
  error?: string;
  details?: any;
}

/**
 * POST /api/admin/delete-supabase-article
 * 
 * Deletes article from Supabase
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'editor', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body: DeleteSupabaseArticleRequest = await request.json();
    const { articleId, slug } = body;

    console.log('[Delete Supabase Article] Request received:', { articleId, slug });

    // Validation
    if (!articleId && !slug) {
      return NextResponse.json({
        success: false,
        error: 'Either articleId or slug must be provided',
      } as DeleteSupabaseArticleResponse, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase.from('published_articles').delete();

    if (articleId) {
      query = query.eq('id', articleId);
    } else if (slug) {
      query = query.or(`slug_en.eq.${slug},slug_pl.eq.${slug}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Delete Supabase Article] Delete failed:', error);
      return NextResponse.json({
        success: false,
        error: `Failed to delete article from Supabase: ${error.message}`,
        articleId,
        slug,
      } as DeleteSupabaseArticleResponse, { status: 500 });
    }

    // Success
    return NextResponse.json({
      success: true,
      articleId,
      slug,
      details: data,
    } as DeleteSupabaseArticleResponse);

  } catch (error: any) {
    console.error('[Delete Supabase Article] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    } as DeleteSupabaseArticleResponse, { status: 500 });
  }
}
