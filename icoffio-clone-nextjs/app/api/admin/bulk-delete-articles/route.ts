/**
 * BULK DELETE ARTICLES API ENDPOINT
 * 
 * Массовое удаление статей из WordPress
 * Использует credentials из Vercel environment variables
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'https://icoffio.com';
const WP_USERNAME = process.env.WP_USERNAME || process.env.WORDPRESS_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || process.env.WORDPRESS_APP_PASSWORD;

interface BulkDeleteRequest {
  slugs: string[];
}

interface BulkDeleteResponse {
  success: boolean;
  deleted: number;
  failed: number;
  notFound: number;
  results: Array<{
    slug: string;
    success: boolean;
    wpPostId?: number;
    error?: string;
  }>;
}

/**
 * Находит WordPress post ID по slug
 */
async function findPostBySlug(slug: string): Promise<number | null> {
  try {
    const searchUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id`;
    const auth = btoa(`${WP_USERNAME}:${WP_APP_PASSWORD}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const posts = await response.json();
    if (Array.isArray(posts) && posts.length > 0) {
      return posts[0].id;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Удаляет WordPress post по ID
 */
async function deletePost(postId: number): Promise<boolean> {
  try {
    const deleteUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts/${postId}?force=true`;
    const auth = btoa(`${WP_USERNAME}:${WP_APP_PASSWORD}`);
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * POST /api/admin/bulk-delete-articles
 * 
 * Массовое удаление статей
 */
export async function POST(request: NextRequest) {
  try {
    if (!WP_USERNAME || !WP_APP_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'WordPress credentials not configured in Vercel',
        deleted: 0,
        failed: 0,
        notFound: 0,
        results: [],
      } as BulkDeleteResponse, { status: 500 });
    }

    const body: BulkDeleteRequest = await request.json();
    const { slugs } = body;

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid slugs array',
        deleted: 0,
        failed: 0,
        notFound: 0,
        results: [],
      } as BulkDeleteResponse, { status: 400 });
    }

    const results: BulkDeleteResponse['results'] = [];
    let deleted = 0;
    let failed = 0;
    let notFound = 0;

    for (const slug of slugs) {
      try {
        const postId = await findPostBySlug(slug);
        
        if (!postId) {
          notFound++;
          results.push({ slug, success: false, error: 'Not found' });
          continue;
        }

        const success = await deletePost(postId);
        
        if (success) {
          deleted++;
          results.push({ slug, success: true, wpPostId: postId });
        } else {
          failed++;
          results.push({ slug, success: false, error: 'Delete failed' });
        }

        // Задержка между удалениями
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        failed++;
        results.push({ slug, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      failed,
      notFound,
      results,
    } as BulkDeleteResponse);

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      deleted: 0,
      failed: 0,
      notFound: 0,
      results: [],
    } as BulkDeleteResponse, { status: 500 });
  }
}

