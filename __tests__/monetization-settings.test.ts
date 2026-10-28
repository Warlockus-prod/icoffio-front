import { describe, it, expect } from 'vitest';
import {
  extractMonetizationSettingsFromContent,
  injectMonetizationSettingsIntoContent,
  resolveArticleAdPlacements,
  resolveArticleVideoPlayers,
} from '@/lib/monetization-settings';
import type { AdPlacementConfig } from '@/lib/config/adPlacements';
import type { VideoPlayerConfig } from '@/lib/config/video-players';

const place = (id: string, addedDate: string) => ({ id, addedDate } as AdPlacementConfig);
const player = (id: string) => ({ id } as VideoPlayerConfig);
const PLACES = [place('a', '2025-01-01'), place('b', '2025-01-01'), place('later', '2026-02-26')];

describe('per-article monetization', () => {
  it('shows everything when the article has no settings', () => {
    expect(resolveArticleAdPlacements(null, PLACES, '2025-06-01').map((p) => p.id)).toEqual(['a', 'b', 'later']);
  });

  it('v1 marker: keeps the editor’s opt-out and shows places added after the article', () => {
    const settings = { version: 1 as const, enabledAdPlacementIds: ['a'], enabledVideoPlayerIds: [] };
    // 'b' existed and was unticked; 'later' did not exist yet — it must show.
    expect(resolveArticleAdPlacements(settings, PLACES, '2025-06-01T10:00:00Z').map((p) => p.id)).toEqual(['a', 'later']);
  });

  it('accepts the Date the PostgreSQL adapter returns for timestamptz (was "r.slice is not a function")', () => {
    const settings = { version: 1 as const, enabledAdPlacementIds: ['a'], enabledVideoPlayerIds: [] };
    const asDate = new Date('2025-06-01T10:00:00Z');
    expect(() => resolveArticleAdPlacements(settings, PLACES, asDate)).not.toThrow();
    // Same answer as the ISO-string form of the same instant.
    expect(resolveArticleAdPlacements(settings, PLACES, asDate).map((p) => p.id)).toEqual(['a', 'later']);
    expect(resolveArticleAdPlacements(settings, PLACES, new Date('invalid')).map((p) => p.id)).toEqual(['a']);
  });

  it('v2 marker: only places the editor actually saw can be opted out', () => {
    const settings = { version: 2 as const, enabledAdPlacementIds: ['a'], enabledVideoPlayerIds: [], knownAdPlacementIds: ['a', 'b'] };
    expect(resolveArticleAdPlacements(settings, PLACES, null).map((p) => p.id)).toEqual(['a', 'later']);
  });

  it('writes v2 markers that round-trip, with the current inventory as "known"', () => {
    const content = injectMonetizationSettingsIntoContent('Body', { enabledAdPlacementIds: ['sidebar-1'], enabledVideoPlayerIds: [] });
    const { settings, cleanContent } = extractMonetizationSettingsFromContent(content);
    expect(cleanContent).toBe('Body');
    expect(settings?.version).toBe(2);
    expect(settings?.knownAdPlacementIds).toContain('sidebar-1');
    expect(settings?.knownAdPlacementIds).toContain('mobile-interstitial');
  });

  it('video: v1 keeps the saved list, v2 adds players the editor never saw', () => {
    const players = [player('instream-article-end'), player('new-player')];
    const v1 = { version: 1 as const, enabledAdPlacementIds: [], enabledVideoPlayerIds: [] };
    expect(resolveArticleVideoPlayers(v1, players)).toEqual([]);
    const v2 = { ...v1, version: 2 as const, knownVideoPlayerIds: ['instream-article-end'] };
    expect(resolveArticleVideoPlayers(v2, players).map((p) => p.id)).toEqual(['new-player']);
  });
});
