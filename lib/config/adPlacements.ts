/**
 * VOX ad inventory — the single source of truth for every ad place on the site.
 *
 * Each entry mirrors one "Ad slot" in the VOX publisher panel
 * (partners.voxexchange.io → Monetization → Ad slots, account "Goleta VOX PL EN").
 * `format` MUST equal the slot size registered there: the SSP only offers
 * creatives of that size, so a mismatch means no fill or a mis-sized banner.
 *
 * To add or change a place: create/edit the slot in the VOX panel first, then
 * mirror it here. Nothing else in the code holds PlaceIDs.
 *
 * Verified against the VOX panel on 2026-10-26.
 */

import type { AdFormat, AdPlacement } from '@/components/UniversalAd';

/** VOX in-image place (Ad slot "InImage Ad slot #1", CPMV floor 5 PLN). */
export const IN_IMAGE_PLACE_ID = '63d93bb54d506e95f039e2e3';

/**
 * VOX video place for the Prebid `vox` bidder (Ad slot "Ad slot #9", VideoPlace,
 * CPM floor 5 PLN; 274 impressions 23–29.10.2026, so the Hybrid video campaign
 * buys it). The panel also has "Video preroll Ad slot #14"
 * (69036eff810d982b30508d46, floor 6 PLN, no traffic yet). The direct DSP VAST
 * tag in video-players.ts is opaque and is not tied to either ID in code.
 */
export const VIDEO_PLACE_ID = '64b662024d506ede18ffa441';

export interface AdPlacementConfig {
  id: string;
  placeId: string;
  format: AdFormat;
  placement: AdPlacement;
  name: string;
  /** Slot name in the VOX publisher panel, for cross-checking. */
  voxSlot: string;
  description: string;
  location: 'article' | 'homepage';
  position: 'header' | 'content-top' | 'content-middle' | 'content-bottom' | 'sidebar-top' | 'sidebar-bottom' | 'footer';
  enabled: boolean;
  priority: number; // 1-10, higher first
  device: 'desktop' | 'mobile' | 'both';
  /**
   * When the place started rendering on articles. Articles whose saved
   * monetization settings predate it still show it (see lib/monetization-settings.ts).
   */
  addedDate: string;
  /**
   * Also served on Prebid hosts (web.icoffio.com), through the Prebid `vox`
   * bidder with this same placeId (components/PrebidVoxAd.tsx). False where a
   * Bidio slot (lib/config/prebidPlacements.ts) already sits at that spot.
   */
  prebid?: boolean;
}

export const AD_PLACEMENTS: AdPlacementConfig[] = [
  // ==================== ARTICLE — DESKTOP ====================
  {
    id: 'desktop-inline-1',
    placeId: '63da9b577bc72f39bc3bfc68',
    format: '728x90',
    placement: 'inline',
    name: 'Leaderboard in article text',
    voxSlot: 'Ad slot #2 728x90',
    description: '728x90 between article paragraphs (desktop)',
    location: 'article',
    position: 'content-top',
    enabled: true,
    priority: 9,
    device: 'desktop',
    addedDate: '2025-01-13',
    prebid: false, // Bidio slot art_2 sits here
  },
  {
    id: 'desktop-inline-2-before-related',
    placeId: '63daa3c24d506e16acfd2a38',
    format: '970x250',
    placement: 'inline',
    name: 'Billboard before related articles',
    voxSlot: 'Ad slot #5 970x250',
    description: '970x250 before the related-articles block (desktop)',
    location: 'article',
    position: 'footer',
    enabled: true,
    priority: 8,
    device: 'desktop',
    addedDate: '2025-01-13',
    prebid: false, // Bidio slot art_3 sits here
  },
  {
    id: 'sidebar-1',
    placeId: '63da9e2a4d506e16acfd2a36',
    format: '300x250',
    placement: 'sidebar',
    name: 'Sidebar rectangle',
    voxSlot: 'Ad slot #3 300x250',
    description: '300x250 at the top of the sticky sidebar (desktop)',
    location: 'article',
    position: 'sidebar-top',
    enabled: true,
    priority: 10,
    device: 'desktop',
    addedDate: '2025-01-13',
    prebid: true,
  },
  {
    id: 'sidebar-2',
    placeId: '63daa2ea7bc72f39bc3bfc72',
    format: '300x600',
    placement: 'sidebar',
    name: 'Sidebar half page',
    voxSlot: 'Ad slot #4 300x600',
    description: '300x600 below the sidebar rectangle (desktop)',
    location: 'article',
    position: 'sidebar-bottom',
    enabled: true,
    priority: 7,
    device: 'desktop',
    addedDate: '2025-01-13',
    prebid: true,
  },

  // ==================== ARTICLE — MOBILE ====================
  {
    id: 'mobile-1',
    placeId: '68f644dc70e7b26b58596f34',
    format: '320x50',
    placement: 'mobile',
    name: 'Mobile banner above the photo',
    voxSlot: 'Ad slot #11 320x50',
    description: '320x50 between the headline and the hero photo (mobile)',
    location: 'article',
    position: 'header',
    enabled: true,
    priority: 9,
    device: 'mobile',
    addedDate: '2025-10-28',
    prebid: true,
  },
  {
    // Until 2026-10-26 this rendered PlaceID 68f6451d… (VOX "Ad slot #12 160x600")
    // in a 320x50 box. It now uses the 320x100 slot, whose size matches the box.
    id: 'mobile-2',
    placeId: '68f645bf810d98e1a08f272f',
    format: '320x100',
    placement: 'mobile',
    name: 'Mobile banner after the article',
    voxSlot: 'Ad slot #13 320x100',
    description: '320x100 after the article text (mobile)',
    location: 'article',
    position: 'content-bottom',
    enabled: true,
    priority: 8,
    device: 'mobile',
    addedDate: '2025-10-28',
    prebid: true,
  },
  {
    id: 'mobile-interstitial',
    placeId: '68f63437810d98e1a08f26de',
    format: '320x480',
    placement: 'display',
    name: 'Mobile interstitial',
    voxSlot: 'Ad slot #10 320x480',
    description: '320x480 fullscreen interstitial, once per session (mobile)',
    location: 'article',
    position: 'content-middle',
    enabled: true,
    priority: 7,
    device: 'mobile',
    addedDate: '2026-02-26',
    prebid: true,
  },

  // ==================== HOMEPAGE ====================
  {
    id: 'homepage-desktop-1',
    placeId: '63daa3c24d506e16acfd2a38',
    format: '970x250',
    placement: 'inline',
    name: 'Homepage billboard',
    voxSlot: 'Ad slot #5 970x250',
    description: '970x250 under the article list (desktop)',
    location: 'homepage',
    position: 'content-bottom',
    enabled: true,
    priority: 8,
    device: 'desktop',
    addedDate: '2025-01-13',
    prebid: true,
  },
  {
    id: 'homepage-mobile-1',
    placeId: '68f645bf810d98e1a08f272f',
    format: '320x100',
    placement: 'mobile',
    name: 'Homepage mobile banner',
    voxSlot: 'Ad slot #13 320x100',
    description: '320x100 under the article list (mobile)',
    location: 'homepage',
    position: 'content-bottom',
    enabled: true,
    priority: 8,
    device: 'mobile',
    addedDate: '2026-09-10',
    prebid: true,
  },
];

/** VOX slots that exist in the publisher panel but are deliberately not rendered. */
export const UNUSED_VOX_SLOTS: Array<{ placeId: string; voxSlot: string; reason: string }> = [
  { placeId: '68f6451d810d98e1a08f2725', voxSlot: 'Ad slot #12 160x600', reason: 'No 160px-wide column in the layout; was mis-rendered as 320x50 until 2026-10-26.' },
];

export function getEnabledAdPlacements(): AdPlacementConfig[] {
  return AD_PLACEMENTS.filter((ad) => ad.enabled);
}

/** Enabled places for a page type, highest priority first. */
export function getAdPlacementsByLocation(location: AdPlacementConfig['location']): AdPlacementConfig[] {
  return getEnabledAdPlacements()
    .filter((ad) => ad.location === location)
    .sort((a, b) => b.priority - a.priority);
}

export function getAdPlacement(location: AdPlacementConfig['location'], id: string): AdPlacementConfig | undefined {
  return getEnabledAdPlacements().find((ad) => ad.location === location && ad.id === id);
}

/** Every PlaceID the site may request — display places plus in-image. */
export function getKnownPlaceIds(): Set<string> {
  return new Set([IN_IMAGE_PLACE_ID, ...getEnabledAdPlacements().map((ad) => ad.placeId)]);
}
