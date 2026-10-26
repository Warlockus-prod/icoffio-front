/**
 * Per-article monetization settings persisted inside article markdown via a hidden comment.
 *
 * Marker example:
 * <!-- ICOFFIO_MONETIZATION {"version":2,"enabledAdPlacementIds":[...],"enabledVideoPlayerIds":[...],
 *      "knownAdPlacementIds":[...],"knownVideoPlayerIds":[...]} -->
 *
 * Version 2 also records which places/players EXISTED when the article was saved.
 * Anything added to the site later is shown by default: the editor could not have
 * opted out of it. Version 1 stored only the enabled list, so every place added
 * after the article was written (e.g. the mobile interstitial) silently never
 * appeared on it. For v1 markers the place's `addedDate` stands in for "known".
 */

import { AD_PLACEMENTS, type AdPlacementConfig } from '@/lib/config/adPlacements';
import { VIDEO_PLAYERS, type VideoPlayerConfig } from '@/lib/config/video-players';

export interface ArticleMonetizationSettings {
  version: 1 | 2;
  enabledAdPlacementIds: string[];
  enabledVideoPlayerIds: string[];
  /** v2+: places that existed when the settings were saved. */
  knownAdPlacementIds?: string[];
  /** v2+: video players that existed when the settings were saved. */
  knownVideoPlayerIds?: string[];
}

const MONETIZATION_MARKER_REGEX = /<!--\s*ICOFFIO_MONETIZATION\s+(\{[\s\S]*?\})\s*-->/;

const uniq = (values?: string[]) => Array.from(new Set((values || []).filter(Boolean)));

export function normalizeMonetizationSettings(
  input?: Partial<ArticleMonetizationSettings> | null
): ArticleMonetizationSettings {
  const settings: ArticleMonetizationSettings = {
    version: input?.version === 2 ? 2 : 1,
    enabledAdPlacementIds: uniq(input?.enabledAdPlacementIds),
    enabledVideoPlayerIds: uniq(input?.enabledVideoPlayerIds),
  };
  if (Array.isArray(input?.knownAdPlacementIds)) settings.knownAdPlacementIds = uniq(input.knownAdPlacementIds);
  if (Array.isArray(input?.knownVideoPlayerIds)) settings.knownVideoPlayerIds = uniq(input.knownVideoPlayerIds);
  return settings;
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

/** Writes a v2 marker: the editor's choice plus the inventory it was made against. */
export function injectMonetizationSettingsIntoContent(
  content: string,
  settings?: Partial<ArticleMonetizationSettings> | null
): string {
  const cleanContent = stripMonetizationMarker(content || '');

  if (!settings) {
    return cleanContent;
  }

  const normalized: ArticleMonetizationSettings = {
    ...normalizeMonetizationSettings(settings),
    version: 2,
    knownAdPlacementIds: AD_PLACEMENTS.map((ad) => ad.id),
    knownVideoPlayerIds: VIDEO_PLAYERS.map((player) => player.id),
  };
  const marker = `<!-- ICOFFIO_MONETIZATION ${JSON.stringify(normalized)} -->`;

  if (!cleanContent.trim()) {
    return marker;
  }

  return `${marker}\n\n${cleanContent}`;
}

/**
 * Places to render on an article: all of them without saved settings; otherwise
 * the ones the editor kept plus any added after the settings were saved.
 * `articleDate` (ISO) is only used for v1 markers.
 */
export function resolveArticleAdPlacements(
  settings: ArticleMonetizationSettings | null,
  placements: AdPlacementConfig[],
  articleDate?: string | null
): AdPlacementConfig[] {
  if (!settings) return placements;
  const enabled = new Set(settings.enabledAdPlacementIds);
  const known = settings.knownAdPlacementIds ? new Set(settings.knownAdPlacementIds) : null;
  const savedDay = articleDate ? articleDate.slice(0, 10) : null;
  return placements.filter((ad) => {
    if (enabled.has(ad.id)) return true;
    if (known) return !known.has(ad.id);
    return savedDay !== null && ad.addedDate > savedDay;
  });
}

/** Same rule for video players (v1 markers have no dates for players: kept as saved). */
export function resolveArticleVideoPlayers(
  settings: ArticleMonetizationSettings | null,
  players: VideoPlayerConfig[]
): VideoPlayerConfig[] {
  if (!settings) return players;
  const enabled = new Set(settings.enabledVideoPlayerIds);
  const known = settings.knownVideoPlayerIds ? new Set(settings.knownVideoPlayerIds) : null;
  return players.filter((player) => enabled.has(player.id) || (known !== null && !known.has(player.id)));
}
