import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    new URL(url);

    // Check if URL is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading content
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; icoffio-parser/1.0)'
      }
    });

    clearTimeout(timeoutId);

    const isAccessible = response.ok;
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');

    return NextResponse.json({
      url,
      accessible: isAccessible,
      isHtml,
      status: response.status,
      statusText: response.statusText,
      contentType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('URL check failed:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof TypeError) {
      errorMessage = 'Invalid URL format';
    } else if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - URL took too long to respond';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      url,
      accessible: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}








