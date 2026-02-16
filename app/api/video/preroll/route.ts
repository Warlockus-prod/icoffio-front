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

  try {
    const response = await fetch(validatedUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/xml,text/xml,*/*',
        'User-Agent': 'icoffio-preroll-resolver/1.0',
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
      return NextResponse.json(
        {
          success: false,
          error: 'No media file found in VAST response',
        },
        { status: 422 }
      );
    }

    const durationMatch = xml.match(/<Duration>([\s\S]*?)<\/Duration>/i);
    const durationSeconds = parseDurationToSeconds(durationMatch?.[1] || '');

    return NextResponse.json({
      success: true,
      mediaUrl,
      durationSeconds,
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

