/**
 * PUBLISH ARTICLE API
 * 
 * Publishes articles to WordPress
 * Used by Telegram bot and admin panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Configure marked for clean HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface PublishRequest {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  language: string;
  author?: string;
  tags?: string[];
  image?: string;
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();
    
    const { title, content, excerpt, category, language, author, tags, image, source } = body;

    // Validate required fields
    if (!title || !content || !excerpt) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, excerpt' },
        { status: 400 }
      );
    }

    // WordPress credentials
    const wpUrl = process.env.WORDPRESS_API_URL || 'https://icoffio.com';
    const wpUsername = process.env.WORDPRESS_USERNAME;
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpUsername || !wpPassword) {
      return NextResponse.json(
        { 
          error: 'WordPress credentials not configured',
          published: false,
          reason: 'missing_credentials'
        },
        { status: 500 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Get category ID (default to 1 if not found)
    let categoryId = 1;
    try {
      const categoriesResponse = await fetch(
        `${wpUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(category)}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`,
          },
        }
      );
      
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        if (categories.length > 0) {
          categoryId = categories[0].id;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch category, using default:', error);
    }

    // Convert Markdown to HTML for WordPress
    const htmlContent = await marked(content);

    // Create post
    const postData = {
      title,
      content: htmlContent, // Use HTML instead of Markdown
      excerpt,
      slug,
      status: 'publish', // Publish immediately
      categories: [categoryId],
      tags: tags || [],
      meta: {
        language: language || 'en',
        author: author || 'icoffio Bot',
        source: source || 'api',
        generated_at: new Date().toISOString()
      }
    };

    const createResponse = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`,
      },
      body: JSON.stringify(postData),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('WordPress publish failed:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to publish to WordPress',
          published: false,
          reason: 'wordpress_error',
          details: errorText
        },
        { status: 500 }
      );
    }

    const publishedPost = await createResponse.json();

    // Generate URL for frontend (app.icoffio.com)
    const frontendUrl = 'https://app.icoffio.com';
    const postUrl = `${frontendUrl}/${language || 'en'}/article/${slug}`;

    return NextResponse.json({
      success: true,
      published: true,
      postId: publishedPost.id,
      url: postUrl,
      slug,
      title: publishedPost.title?.rendered || title,
      category: category,
      language: language || 'en',
      publishedAt: publishedPost.date || new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Publish article error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error',
        published: false,
        reason: 'server_error'
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const wpUrl = process.env.WORDPRESS_API_URL || 'https://icoffio.com';
  const wpUsername = process.env.WORDPRESS_USERNAME;
  const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

  const configured = !!(wpUsername && wpPassword);

  return NextResponse.json({
    service: 'Article Publisher',
    version: '1.0.0',
    wordpress: {
      configured,
      url: wpUrl
    }
  });
}

