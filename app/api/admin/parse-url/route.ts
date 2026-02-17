/**
 * API ENDPOINT: Parse URL
 * 
 * Извлекает контент из URL для публикации статьи
 */

import { NextRequest, NextResponse } from 'next/server';
import { urlParserService } from '@/lib/url-parser-service';
import { appendServerLog } from '@/lib/server-log-store';
import { requireAdminRole } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds для парсинга

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'editor', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log(`[Parse URL API] Parsing: ${url}`);
    await appendServerLog('info', 'parser', 'parse_url_start', 'Started parsing URL', { url });

    // Используем URL Parser Service (singleton instance)
    const result = await urlParserService.extractContent(url);

    console.log(`[Parse URL API] Successfully parsed: ${result.title}`);
    await appendServerLog('info', 'parser', 'parse_url_success', 'URL parsed successfully', {
      url,
      title: result.title,
      source: result.source,
      language: result.language,
      contentLength: result.content?.length || 0,
    });

    return NextResponse.json({
      success: true,
      title: result.title,
      content: result.content,
      excerpt: result.excerpt || result.content.substring(0, 160),
      author: result.author,
      publishedAt: result.publishedAt,
      image: result.image,
      category: result.category,
      language: result.language,
      source: result.source,
      siteName: result.siteName
    });

  } catch (error: any) {
    console.error('[Parse URL API] Error:', error);
    await appendServerLog('error', 'parser', 'parse_url_error', 'URL parsing failed', {
      error: error?.message || 'Unknown error',
      details: error?.toString?.() || String(error),
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to parse URL',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
