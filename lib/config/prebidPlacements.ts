/**
 * BIDIO (Prebid) — configuration for the web.icoffio.com test integration
 *
 * Bidio is a hosted Prebid wrapper: the SDK is loaded once, `bidio.init()` is
 * called on the `BidioReady` event, and the SDK then fills any `<div>` whose DOM
 * id matches a placement registered on Bidio's side for this websiteId.
 *
 * IMPORTANT: `id` below must match exactly what the partner configured for
 * web.icoffio.com. An unknown id is harmless (the slot just stays empty), but it
 * will never fill.
 */

/** websiteId issued by Bidio for web.icoffio.com */
export const BIDIO_WEBSITE_ID = 'w01m0f324m0802kv884xkj1fv7y';

/** Bidio SDK (dev build supplied by the partner) */
export const BIDIO_SDK_URL = 'https://files.bidio.pl/bidio-sdk-dev.js';

/** Global the wrapper exposes Prebid.js under */
export const BIDIO_PREBID_GLOBAL = 'pbjs';

/**
 * Bidio SDK v1.0.6 exposes only `getVersion` and `init` — there is no refresh
 * API. Next.js client-side navigation swaps the slot <div>s for fresh empty
 * ones, and nothing refills them, so we call init() again on route change.
 *
 * This is the only lever the SDK gives us. If Bidio turns out to double-load
 * Prebid on a second init, set this to false and ask the partner for a proper
 * refresh method.
 */
export const BIDIO_REINIT_ON_ROUTE_CHANGE = true;

export type PrebidPosition = 'content-top' | 'content-middle' | 'content-bottom';

export interface PrebidPlacementConfig {
  /** DOM id the Bidio SDK looks up — must match partner configuration */
  id: string;
  name: string;
  location: 'article' | 'homepage';
  position: PrebidPosition;
  device: 'desktop' | 'mobile' | 'both';
  enabled: boolean;
  /** false = id is our assumption, not yet confirmed by the partner */
  confirmed: boolean;
}

export const PREBID_PLACEMENTS: PrebidPlacementConfig[] = [
  {
    id: 'art_1',
    name: 'Article — after hero image',
    location: 'article',
    position: 'content-top',
    device: 'both',
    enabled: true,
    confirmed: true, // supplied by the partner
  },
  {
    id: 'art_2',
    name: 'Article — after content',
    location: 'article',
    position: 'content-middle',
    device: 'both',
    enabled: true,
    confirmed: false, // assumed naming — ask Bidio to register it
  },
  {
    id: 'art_3',
    name: 'Article — before related articles',
    location: 'article',
    position: 'content-bottom',
    device: 'both',
    enabled: true,
    confirmed: false, // assumed naming — ask Bidio to register it
  },
];

export function getPrebidPlacements(
  location: PrebidPlacementConfig['location']
): PrebidPlacementConfig[] {
  return PREBID_PLACEMENTS.filter((p) => p.enabled && p.location === location);
}

export function getPrebidPlacement(
  location: PrebidPlacementConfig['location'],
  position: PrebidPosition
): PrebidPlacementConfig | undefined {
  return getPrebidPlacements(location).find((p) => p.position === position);
}
