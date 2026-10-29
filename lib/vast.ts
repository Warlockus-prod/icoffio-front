/**
 * Inline VAST parsing, shared by the server resolver (app/api/video/preroll)
 * and the browser, which gets VAST XML straight from a Prebid video bid
 * (`bid.vastXml`, see lib/prebid-vox.ts).
 *
 * Regex-based on purpose: it runs in Node without a DOM, and the player only
 * needs the media file, the duration and the tracking URLs. Wrapper chains are
 * not followed.
 */

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

export type VastParseResult =
  | {
    ok: true;
    mediaUrl: string;
    durationSeconds: number | null;
    tracking: VastTrackingEvents;
    candidateCount: number;
  }
  | { ok: false; reason: 'no_fill' | 'unsupported_wrapper' | 'missing_media' };

export function parseDurationToSeconds(rawDuration: string): number | null {
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

export function extractVastMediaCandidates(xml: string): VastMediaCandidate[] {
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

export function pickBestMediaUrl(candidates: VastMediaCandidate[]): string | null {
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
export function extractTrackingEvents(xml: string): VastTrackingEvents {
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
  const eventKeys: Record<string, keyof VastTrackingEvents> = {
    start: 'start', firstquartile: 'firstQuartile', midpoint: 'midpoint',
    thirdquartile: 'thirdQuartile', complete: 'complete', skip: 'skip',
    mute: 'mute', unmute: 'unmute', pause: 'pause', resume: 'resume',
  };
  const trackingRegex = /<Tracking\b([^>]*)>([\s\S]*?)<\/Tracking>/gi;
  while ((m = trackingRegex.exec(xml)) !== null) {
    const event = m[1].match(/\bevent\s*=\s*["']([^"']+)["']/i)?.[1].toLowerCase();
    const url = decodeXmlText(m[2]).trim();
    if (!/^https?:\/\//i.test(url)) continue;

    const key = event ? eventKeys[event] : undefined;
    if (key && Array.isArray(tracking[key])) {
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

/** Media file, duration and tracking of an inline VAST document, or why there is none. */
export function parseInlineVast(xml: string): VastParseResult {
  const candidates = extractVastMediaCandidates(xml);
  const mediaUrl = pickBestMediaUrl(candidates);

  if (!mediaUrl) {
    const hasAd = /<Ad\b/i.test(xml);
    const hasWrapper = /<Wrapper\b/i.test(xml);
    return { ok: false, reason: !hasAd ? 'no_fill' : hasWrapper ? 'unsupported_wrapper' : 'missing_media' };
  }

  const durationMatch = xml.match(/<Duration>([\s\S]*?)<\/Duration>/i);
  return {
    ok: true,
    mediaUrl,
    durationSeconds: parseDurationToSeconds(durationMatch?.[1] || ''),
    tracking: extractTrackingEvents(xml),
    candidateCount: candidates.length,
  };
}
