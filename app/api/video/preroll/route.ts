import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DSP_HOSTS = new Set([
  'ssp.hybrid.ai',
  'dsa-eu.hybrid.ai',
]);

interface VastMediaCandidate {
  url: string;
  type: string;
  bitrate: number;
}

/** VAST tracking events we extract and forward to the client */
export interface VastTrackingEvents {
  impression: string[];
  start: string[];
  firstQuartile: string[];
  midpoint: string[];
  thirdQuartile: string[];
  complete: string[];
  skip: string[];
  mute: string[];
  unmute: string[];
  pause: string[];
  resume: string[];
  error: string[];
  clickThrough: string | null;
  clickTracking: string[];
}

function parseDurationToSeconds(rawDuration: string): number | null {
  const value = (rawDuration || '').trim();
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10) || 0;
  const minutes = Number.parseInt(match[2], 10) || 0;
  const seconds = Number.parseInt(match[3], 10) || 0;
  const fraction = match[4] ? Number.parseInt(match[4], 10) / 10 ** match[4].length : 0;
  return hours * 3600 + minutes * 60 + seconds + fraction;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractVastMediaCandidates(xml: string): VastMediaCandidate[] {
  const mediaTagRegex = /<MediaFile\b([^>]*)>([\s\S]*?)<\/MediaFile>/gi;
  const candidates: VastMediaCandidate[] = [];

  let match: RegExpExecArray | null = null;
  while ((match = mediaTagRegex.exec(xml)) !== null) {
    const attrs = match[1] || '';
    const body = decodeXmlText(match[2] || '').trim();
    if (!body || !/^https?:\/\//i.test(body)) continue;

    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    const bitrateMatch = attrs.match(/\bbitrate\s*=\s*["']?(\d+)["']?/i);

    candidates.push({
      url: body,
      type: (typeMatch?.[1] || '').toLowerCase(),
      bitrate: Number.parseInt(bitrateMatch?.[1] || '0', 10) || 0,
    });
  }

  return candidates;
}

function pickBestMediaUrl(candidates: VastMediaCandidate[]): string | null {
  if (!candidates || candidates.length === 0) return null;

  const mp4 = candidates
    .filter((item) => item.type.includes('mp4') || /\.mp4(?:[?#]|$)/i.test(item.url))
    .sort((a, b) => b.bitrate - a.bitrate);

  if (mp4.length > 0) return mp4[0].url;

  const sorted = [...candidates].sort((a, b) => b.bitrate - a.bitrate);
  return sorted[0]?.url || null;
}

/**
 * Extract all VAST tracking URLs from XML.
 * Covers: Impression, TrackingEvents, VideoClicks, Error.
 */
function extractTrackingEvents(xml: string): VastTrackingEvents {
  const tracking: VastTrackingEvents = {
    impression: [],
    start: [],
    firstQuartile: [],
    midpoint: [],
    thirdQuartile: [],
    complete: [],
    skip: [],
    mute: [],
    unmute: [],
    pause: [],
    resume: [],
    error: [],
    clickThrough: null,
    clickTracking: [],
  };

  // <Impression> URLs (can appear multiple times)
  const impressionRegex = /<Impression\b[^>]*>([\s\S]*?)<\/Impression>/gi;
  let m: RegExpExecArray | null = null;
  while ((m = impressionRegex.exec(xml)) !== null) {
    const url = decodeXmlText(m[1]).trim();
    if (/^https?:\/\//i.test(url)) tracking.impression.push(url);
  }

  // <Tracking event="..."> URLs
  const trackingRegex = /<Tracking\s+event\s*=\s*["'](\w+)["'][^>]*>([\s\S]*?)<\/Tracking>/gi;
  while ((m = trackingRegex.exec(xml)) !== null) {
    const event = m[1].toLowerCase();
    const url = decodeXmlText(m[2]).trim();
    if (!/^https?:\/\//i.test(url)) continue;

    const key = event as keyof VastTrackingEvents;
    if (key in tracking && Array.isArray(tracking[key])) {
      (tracking[key] as string[]).push(url);
    }
  }

  // <ClickThrough> URL
  const clickThroughMatch = xml.match(/<ClickThrough\b[^>]*>([\s\S]*?)<\/ClickThrough>/i);
  if (clickThroughMatch) {
    const url = decodeXmlText(clickThroughMatch[1]).trim();
    if (/^https?:\/\//i.test(url)) tracking.clickThrough = url;
  }

  // <ClickTracking> URLs
  const clickTrackingRegex = /<ClickTracking\b[^>]*>([\s\S]*?)<\/ClickTracking>/gi;
  while ((m = clickTrackingRegex.exec(xml)) !== null) {
    const url = decodeXmlText(m[1]).trim();
    if (/^https?:\/\//i.test(url)) tracking.clickTracking.push(url);
  }

  // <Error> URLs
  const errorRegex = /<Error\b[^>]*>([\s\S]*?)<\/Error>/gi;
  while ((m = errorRegex.exec(xml)) !== null) {
    const url = decodeXmlText(m[1]).trim();
    if (/^https?:\/\//i.test(url)) tracking.error.push(url);
  }

  return tracking;
}

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
      },
      { status: 400 }
    );
  }

  // Forward real client headers to DSP for proper ad targeting & tracking
  const clientIp = getClientIp(request);
  const clientUa = request.headers.get('user-agent') || '';
  const clientReferer = request.headers.get('referer') || '';

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
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to load VAST XML (${response.status})`,
        },
        { status: 502 }
      );
    }

    const xml = await response.text();
    const candidates = extractVastMediaCandidates(xml);
    const mediaUrl = pickBestMediaUrl(candidates);

    if (!mediaUrl) {
      // Check if it's an empty VAST (no ad available) vs error
      const hasAd = /<Ad\b/i.test(xml);
      return NextResponse.json(
        {
          success: false,
          error: hasAd
            ? 'No media file found in VAST response'
            : 'No ad available (empty VAST)',
          vastEmpty: !hasAd,
        },
        { status: 422 }
      );
    }

    const durationMatch = xml.match(/<Duration>([\s\S]*?)<\/Duration>/i);
    const durationSeconds = parseDurationToSeconds(durationMatch?.[1] || '');
    const tracking = extractTrackingEvents(xml);

    return NextResponse.json({
      success: true,
      mediaUrl,
      durationSeconds,
      tracking,
      sourceHost: validatedUrl.hostname,
      candidateCount: candidates.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'VAST resolver error',
      },
      { status: 500 }
    );
  }
}
