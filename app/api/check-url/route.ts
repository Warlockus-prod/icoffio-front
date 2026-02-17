import { NextRequest, NextResponse } from 'next/server';
import { isIP } from 'node:net';
import { requireAdminRole } from '@/lib/admin-auth';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google.internal.',
]);

function isPrivateIpAddress(hostname: string): boolean {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const octets = hostname.split('.').map((part) => Number(part));
    const [a, b] = octets;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (ipVersion === 6) {
    const normalized = hostname.toLowerCase();
    if (normalized === '::1') return true;
    if (normalized.startsWith('fe80:')) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('::ffff:127.')) return true;
  }

  return false;
}

function isBlockedTarget(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;

  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) return true;
  return isPrivateIpAddress(normalized);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'viewer', { allowRefresh: false });
  if (!auth.ok) return auth.response;

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
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: 'Only http/https URLs are allowed' },
        { status: 400 }
      );
    }

    if (isBlockedTarget(parsed.hostname)) {
      return NextResponse.json(
        { error: 'Blocked hostname. Private/internal targets are not allowed.' },
        { status: 403 }
      );
    }

    // Check if URL is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading content
      signal: controller.signal,
      redirect: 'manual',
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














