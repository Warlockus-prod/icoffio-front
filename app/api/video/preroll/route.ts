import { NextRequest, NextResponse } from 'next/server';
import { parseInlineVast } from '@/lib/vast';

const ALLOWED_DSP_HOSTS = new Set([
  'ssp.hybrid.ai',
  'dsa-eu.hybrid.ai',
]);

// The player (components/VideoPlayer.tsx) gives up on this route after 15s.
// Give the DSP less than that: a slow or no-fill VAST tag must not keep a
// worker socket open after the browser has already moved on. Observed live:
// a single tag held the route for 10.5s before this guard existed.
const PREROLL_UPSTREAM_TIMEOUT_MS = Number(process.env.PREROLL_UPSTREAM_TIMEOUT_MS) || 8000;

export type { VastTrackingEvents } from '@/lib/vast';

function validateTagUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    if (!ALLOWED_DSP_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Extract the real client IP from request headers.
 * Checks X-Forwarded-For, X-Real-IP, then falls back to connection info.
 */
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return request.headers.get('cf-connecting-ip') || '127.0.0.1';
}

export async function GET(request: NextRequest) {
  const tagUrlRaw = request.nextUrl.searchParams.get('tagUrl') || '';
  const validatedUrl = validateTagUrl(tagUrlRaw.trim());

  if (!validatedUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid or unsupported DSP/VAST tag URL',
        reason: 'invalid_tag',
      },
      { status: 400 }
    );
  }

  // Forward real client headers to DSP for proper ad targeting & tracking
  const clientIp = getClientIp(request);
  const clientUa = request.headers.get('user-agent') || '';
  const clientReferer = request.headers.get('referer') || '';

  const upstream = new AbortController();
  const upstreamTimer = setTimeout(() => upstream.abort(), PREROLL_UPSTREAM_TIMEOUT_MS);
  // If the browser abandons the request, drop the DSP call with it.
  request.signal?.addEventListener('abort', () => upstream.abort(), { once: true });

  try {
    const response = await fetch(validatedUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/xml,text/xml,*/*',
        'User-Agent': clientUa || 'icoffio-preroll-resolver/1.0',
        'X-Forwarded-For': clientIp,
        'X-Real-IP': clientIp,
        ...(clientReferer ? { Referer: clientReferer } : {}),
      },
      cache: 'no-store',
      // The hostname allowlist must apply to every outbound hop. This resolver
      // does not support redirect chains or VAST wrappers; never follow one to
      // an arbitrary destination from this public endpoint.
      redirect: 'manual',
      signal: upstream.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json(
        { success: false, error: 'DSP redirect is not supported', reason: 'blocked_redirect', vastEmpty: false },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to load VAST XML (${response.status})`,
          reason: 'upstream_http_error',
        },
        { status: 502 }
      );
    }

    const xml = await response.text();
    if (response.status !== 204 && !/<VAST\b/i.test(xml)) {
      return NextResponse.json(
        { success: false, error: 'DSP returned an invalid VAST document', reason: 'invalid_vast', vastEmpty: false },
        { status: 502 }
      );
    }
    const parsed = parseInlineVast(xml);

    if (!parsed.ok) {
      // Empty VAST (no ad available) vs a document the player cannot use
      const errors = {
        no_fill: 'No ad available (empty VAST)',
        unsupported_wrapper: 'VAST wrapper is not supported by this player',
        missing_media: 'No media file found in VAST response',
      } as const;
      return NextResponse.json(
        {
          success: false,
          error: errors[parsed.reason],
          vastEmpty: parsed.reason === 'no_fill',
          reason: parsed.reason,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      reason: 'filled',
      mediaUrl: parsed.mediaUrl,
      durationSeconds: parsed.durationSeconds,
      tracking: parsed.tracking,
      sourceHost: validatedUrl.hostname,
      candidateCount: parsed.candidateCount,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Timed out or the client went away — either way there is no ad to play.
      return NextResponse.json(
        {
          success: false,
          error: `DSP tag did not answer within ${PREROLL_UPSTREAM_TIMEOUT_MS} ms`,
          vastEmpty: false,
          timedOut: true,
          reason: request.signal?.aborted ? 'client_aborted' : 'upstream_timeout',
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'VAST resolver error',
        reason: 'upstream_error',
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(upstreamTimer);
  }
}
