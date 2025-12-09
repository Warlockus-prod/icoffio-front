/**
 * API ENDPOINT: Parse URL
 * 
 * Извлекает контент из URL для публикации статьи
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedUrlParser } from '@/lib/advanced-url-parser';
import { systemLogger } from '@/lib/system-logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds для парсинга

export async function POST(request: NextRequest) {
  const timer = systemLogger.startTimer('api', 'parse_url', 'Parsing URL');
  
  try {
    const { url } = await request.json();

    if (!url) {
      await systemLogger.warn('api', 'parse_url', 'URL is required - empty request', { url });
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log(`[Parse URL API] Parsing: ${url}`);
    await systemLogger.info('api', 'parse_url', `Starting URL parsing`, { url });

    // Используем Advanced URL Parser
    const result = await advancedUrlParser.extractContent(url);

    console.log(`[Parse URL API] Successfully parsed: ${result.title}`);
    
    await timer.success('URL parsed successfully', {
      url,
      title: result.title,
      contentLength: result.content?.length || 0,
      category: result.category,
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
    
    await timer.error('URL parsing failed', {
      errorMessage: error.message,
    }, error.stack);
    
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

