/**
 * DELETE ARTICLE API ENDPOINT
 * 
 * Deletes an article from WordPress by slug
 * Used by Telegram bot for article deletion
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'https://icoffio.com';
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

interface DeleteArticleRequest {
  slug: string;
  locale?: 'en' | 'pl';
}

interface DeleteArticleResponse {
  success: boolean;
  slug?: string;
  wpPostId?: number;
  locale?: string;
  error?: string;
  details?: any;
}

/**
 * Find WordPress post ID by slug
 */
async function findPostBySlug(slug: string): Promise<number | null> {
  try {
    const searchUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,slug`;
    
    console.log('[Delete Article] Searching for post:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${btoa(`${WP_USERNAME}:${WP_APP_PASSWORD}`)}`,
      },
    });

    if (!response.ok) {
      console.error('[Delete Article] Search failed:', response.status, response.statusText);
      return null;
    }

    const posts = await response.json();
    
    if (!Array.isArray(posts) || posts.length === 0) {
      console.log('[Delete Article] No post found with slug:', slug);
      return null;
    }

    const postId = posts[0].id;
    console.log('[Delete Article] Found post ID:', postId, 'for slug:', slug);
    return postId;
  } catch (error) {
    console.error('[Delete Article] Error searching for post:', error);
    return null;
  }
}

/**
 * Delete WordPress post by ID
 */
async function deletePost(postId: number): Promise<boolean> {
  try {
    const deleteUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts/${postId}?force=true`;
    
    console.log('[Delete Article] Deleting post:', deleteUrl);
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(`${WP_USERNAME}:${WP_APP_PASSWORD}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Delete Article] Delete failed:', response.status, errorData);
      return false;
    }

    const result = await response.json();
    console.log('[Delete Article] Post deleted successfully:', result);
    return true;
  } catch (error) {
    console.error('[Delete Article] Error deleting post:', error);
    return false;
  }
}

/**
 * POST /api/admin/delete-article
 * 
 * Deletes article from WordPress
 */
export async function POST(request: NextRequest) {
  try {
    const body: DeleteArticleRequest = await request.json();
    const { slug, locale = 'en' } = body;

    console.log('[Delete Article] Request received:', { slug, locale });

    // Validation
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid slug parameter',
      } as DeleteArticleResponse, { status: 400 });
    }

    if (!WP_USERNAME || !WP_APP_PASSWORD) {
      console.error('[Delete Article] Missing WordPress credentials');
      return NextResponse.json({
        success: false,
        error: 'WordPress credentials not configured',
      } as DeleteArticleResponse, { status: 500 });
    }

    // Find post by slug
    const postId = await findPostBySlug(slug);
    
    if (!postId) {
      return NextResponse.json({
        success: false,
        error: 'Article not found',
        slug,
      } as DeleteArticleResponse, { status: 404 });
    }

    // Delete post
    const deleted = await deletePost(postId);

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete article from WordPress',
        slug,
        wpPostId: postId,
      } as DeleteArticleResponse, { status: 500 });
    }

    // Success
    return NextResponse.json({
      success: true,
      slug,
      wpPostId: postId,
      locale,
    } as DeleteArticleResponse);

  } catch (error: any) {
    console.error('[Delete Article] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    } as DeleteArticleResponse, { status: 500 });
  }
}

