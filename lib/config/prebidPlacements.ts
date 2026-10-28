/**
 * BIDIO (Prebid) — configuration for the web.icoffio.com test integration
 *
 * The partner moved us to the "lazy" build (2026-10-28), which has a different
 * contract from the old `bidio-sdk-dev.js`:
 *
 *   OLD: load SDK → wait for the `BidioReady` event → call `bidio.init({...})`
 *   NEW: set `window.BIDIO_LAZY_CONFIG` → load SDK → it self-initialises
 *
 * The lazy build exposes no globals and fires no events: it reads
 * `window.BIDIO_LAZY_CONFIG` once, synchronously, so the config object MUST be
 * in place before the script executes. It then pulls Prebid
 * (files.bidio.pl/prebid.js) and GPT (securepubads.g.doubleclick.net) itself,
 * and fetches placements from as.bidio.pl/o for this websiteId. Slots are
 * requested lazily through an IntersectionObserver.
 *
 * IMPORTANT: `id` below must match exactly what the partner configured for
 * web.icoffio.com. An unknown id is harmless (the slot just stays empty), but it
 * will never fill.
 */

/** websiteId issued by Bidio for web.icoffio.com */
export const BIDIO_WEBSITE_ID = 'w01m0f324m0802kv884xkj1fv7y';

/** Bidio SDK — lazy build, supplied by the partner on 2026-10-28 */
export const BIDIO_SDK_URL = 'https://files.bidio.pl/bidio-lazy.min.js';

/** Global the wrapper exposes Prebid.js under */
export const BIDIO_PREBID_GLOBAL = 'pbjs';

/**
 * ⚠️ TEST SUBDOMAIN ONLY — must be `true` before any real traffic.
 *
 * This is the vendor's own switch, not a workaround. In the lazy build:
 *
 *   a.gdprEnabled
 *     ? x.consentManagement = { gdpr: {cmpApi:'iab', timeout:8e3, defaultGdprScope:!0}, tcf: {...} }
 *     : r("gdprEnabled=false: consentManagement OFF, use on TEST pages only")
 *
 * With `false` the consentManagement module is never configured, so Prebid
 * stops cancelling every auction with "TCF2 CMP not found" — the exact wall
 * this integration hit in September, when the only known fixes were a certified
 * CMP or a server-side change by Bidio.
 *
 * The trade-off is unchanged: no TCF string reaches the bidders, so EU demand
 * may still decline or bid non-personalised. It proves the pipeline; it is not
 * a revenue configuration. Set it back to `true` and configure a CMP
 * (lib/config/cmp.ts) before this leaves the test subdomain.
 */
export const BIDIO_GDPR_ENABLED = false;

/**
 * The config object the lazy SDK reads from `window.BIDIO_LAZY_CONFIG`.
 * Everything else (endpoints, timeouts, lazy-load margin, price granularity)
 * keeps the SDK's own defaults.
 */
export function buildBidioLazyConfig(): Record<string, unknown> {
  return {
    websiteId: BIDIO_WEBSITE_ID,
    prebidGlobal: BIDIO_PREBID_GLOBAL,
    gdprEnabled: BIDIO_GDPR_ENABLED,
  };
}

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
