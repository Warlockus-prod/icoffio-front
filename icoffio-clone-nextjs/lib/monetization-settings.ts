/**
 * Per-article monetization settings persisted inside article markdown via a hidden comment.
 *
 * Marker example:
 * <!-- ICOFFIO_MONETIZATION {"version":1,"enabledAdPlacementIds":["..."],"enabledVideoPlayerIds":["..."]} -->
 */

export interface ArticleMonetizationSettings {
  version: 1;
  enabledAdPlacementIds: string[];
  enabledVideoPlayerIds: string[];
}

const MONETIZATION_MARKER_REGEX = /<!--\s*ICOFFIO_MONETIZATION\s+(\{[\s\S]*?\})\s*-->/;

export function normalizeMonetizationSettings(
  input?: Partial<ArticleMonetizationSettings> | null
): ArticleMonetizationSettings {
  return {
    version: 1,
    enabledAdPlacementIds: Array.from(
      new Set((input?.enabledAdPlacementIds || []).filter(Boolean))
    ),
    enabledVideoPlayerIds: Array.from(
      new Set((input?.enabledVideoPlayerIds || []).filter(Boolean))
    ),
  };
}

export function stripMonetizationMarker(content: string): string {
  if (!content) return '';
  return content.replace(MONETIZATION_MARKER_REGEX, '').trimStart();
}

export function extractMonetizationSettingsFromContent(content: string): {
  settings: ArticleMonetizationSettings | null;
  cleanContent: string;
} {
  if (!content) {
    return { settings: null, cleanContent: '' };
  }

  const match = content.match(MONETIZATION_MARKER_REGEX);
  if (!match || !match[1]) {
    return { settings: null, cleanContent: content };
  }

  try {
    const parsed = JSON.parse(match[1]);
    const settings = normalizeMonetizationSettings(parsed);
    const cleanContent = stripMonetizationMarker(content);
    return { settings, cleanContent };
  } catch (error) {
    console.warn('[MonetizationSettings] Failed to parse marker, using content as-is');
    return { settings: null, cleanContent: content };
  }
}

export function injectMonetizationSettingsIntoContent(
  content: string,
  settings?: Partial<ArticleMonetizationSettings> | null
): string {
  const cleanContent = stripMonetizationMarker(content || '');

  if (!settings) {
    return cleanContent;
  }

  const normalized = normalizeMonetizationSettings(settings);
  const marker = `<!-- ICOFFIO_MONETIZATION ${JSON.stringify(normalized)} -->`;

  if (!cleanContent.trim()) {
    return marker;
  }

  return `${marker}\n\n${cleanContent}`;
}
