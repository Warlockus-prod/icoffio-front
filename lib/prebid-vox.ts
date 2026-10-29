/**
 * VOX display and video through Prebid (web.icoffio.com).
 *
 * Same approach as lib/prebid-inimage.ts: our own one-unit auctions on Bidio's
 * pbjs instance, with the `vox` bidder from Bidio's Prebid build and the VOX
 * placeIds the main site already uses. Bidio's lazy SDK only fills its own GPT
 * slots (art_1…art_3), so the other places would stay empty on Prebid hosts.
 *
 * Adapter contract (voxBidAdapter, docs.prebid.org/dev-docs/bidders/vox):
 *   banner: mediaTypes.banner.sizes + params { placement: 'banner', placementId }
 *           → bid.ad loads st.hybrid.ai/prebidrenderer.js (`registerAds`)
 *   video:  mediaTypes.video { context, playerSize } + params { placement: 'video', placementId }
 *           → bid.vastXml (inline VAST), played by the site's own player
 *             (components/VideoPlayer.tsx); see buildVoxVideoUnit for the context
 *   → POST https://ssp.hybrid.ai/auction/prebid
 */

export const PREBID_VOX_TIMEOUT_MS = 1500;
/** The player box on the article page is 16:9. */
export const VOX_VIDEO_PLAYER_SIZE: [number, number] = [640, 360];

/** Fired once Bidio's lazy SDK has executed (its setConfig is queued on pbjs.que). */
export const PREBID_READY_EVENT = 'icoffio:prebid-ready';
const READY_FLAG = '__icoffioPrebidReady';

export interface PrebidBid {
  adId: string;
  cpm: number;
  bidder: string;
  adUnitCode: string;
  mediaType?: string;
  width?: number;
  height?: number;
  vastXml?: string;
}

interface Pbjs {
  que: Array<() => void>;
  requestBids?: (request: { adUnits: unknown[]; timeout: number; bidsBackHandler: () => void }) => void;
  getHighestCpmBids?: (adUnitCode: string) => PrebidBid[];
  renderAd?: (doc: Document, adId: string) => void;
  markWinningBidAsUsed?: (options: { adId: string; analytics?: boolean }) => void;
}

type Win = Window & typeof globalThis;

export function getPbjs(win: Win, prebidGlobal: string): Pbjs {
  const holder = win as unknown as Record<string, Pbjs | undefined>;
  const instance = holder[prebidGlobal] || (holder[prebidGlobal] = { que: [] } as Pbjs);
  if (!Array.isArray(instance.que)) instance.que = [];
  return instance;
}

export function markPrebidReady(win: Win): void {
  const holder = win as unknown as Record<string, unknown>;
  if (holder[READY_FLAG]) return;
  holder[READY_FLAG] = true;
  win.dispatchEvent(new win.Event(PREBID_READY_EVENT));
}

/** Run `callback` once the Prebid stack can take auctions; returns an unsubscribe. */
export function onPrebidReady(win: Win, callback: () => void): () => void {
  if ((win as unknown as Record<string, unknown>)[READY_FLAG]) {
    callback();
    return () => {};
  }
  const listener = () => callback();
  win.addEventListener(PREBID_READY_EVENT, listener, { once: true });
  return () => win.removeEventListener(PREBID_READY_EVENT, listener);
}

let unitCounter = 0;
export function nextUnitCode(kind: 'banner' | 'video'): string {
  return `icoffio-vox-${kind}-${++unitCounter}`;
}

export function buildVoxBannerUnit(code: string, placeId: string, size: [number, number]) {
  return {
    code,
    mediaTypes: { banner: { sizes: [size] } },
    bids: [{ bidder: 'vox', params: { placement: 'banner', placementId: placeId } }],
  };
}

/**
 * Video unit. Prebid drops an `instream` bid that carries only `vastXml`
 * unless a prebid cache is configured ("will not work when a prebid cache url
 * is not specified" — measured live 2026-10-29: SSP bid 5 PLN, 0 bids in
 * Prebid), and the cache is Bidio's global config. An `outstream` bid instead
 * needs a renderer; one with no `url` is installed with renderNow and never
 * loads a script. It is never called either: the site's player takes
 * `bid.vastXml` itself.
 */
export function buildVoxVideoUnit(code: string, placeId: string) {
  return {
    code,
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [VOX_VIDEO_PLAYER_SIZE],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        skip: 1,
        renderer: { render: () => {} },
      },
    },
    bids: [{ bidder: 'vox', params: { placement: 'video', placementId: placeId } }],
  };
}

/** One auction for one unit; resolves with the winning bid, or null on no bid. */
export function requestVoxBid(
  win: Win,
  prebidGlobal: string,
  unit: { code: string },
  timeout = PREBID_VOX_TIMEOUT_MS
): Promise<PrebidBid | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (bid: PrebidBid | null) => {
      if (settled) return;
      settled = true;
      win.clearTimeout(guard);
      resolve(bid);
    };
    // Prebid never loaded, or never called back: give up instead of hanging.
    const guard = win.setTimeout(() => done(null), timeout + 5000);

    getPbjs(win, prebidGlobal).que.push(() => {
      const instance = getPbjs(win, prebidGlobal);
      if (!instance.requestBids) return done(null);
      instance.requestBids({
        adUnits: [unit],
        timeout,
        bidsBackHandler: () => done(instance.getHighestCpmBids?.(unit.code)?.[0] ?? null),
      });
    });
  });
}

/**
 * Render a banner bid into a frame of the place's size inside `host`. Prebid
 * puts the creative in a nested frame sized to the bid, which for banners is
 * the slot size. Returns a cleanup, or null when nothing was rendered.
 */
export function renderVoxBanner(
  win: Win,
  doc: Document,
  prebidGlobal: string,
  bid: PrebidBid,
  host: HTMLElement,
  [width, height]: [number, number]
): (() => void) | null {
  const instance = getPbjs(win, prebidGlobal);
  if (!instance.renderAd) return null;

  const frame = doc.createElement('iframe');
  frame.id = bid.adUnitCode;
  frame.name = bid.adUnitCode;
  frame.title = 'Advertisement';
  frame.width = String(width);
  frame.height = String(height);
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('frameborder', '0');
  frame.style.cssText = 'display:block;border:0;margin:0 auto;max-width:100%;';
  host.appendChild(frame);

  const frameDoc = frame.contentDocument;
  if (!frameDoc) {
    frame.remove();
    return null;
  }
  if (frameDoc.body) frameDoc.body.style.margin = '0';
  try {
    instance.renderAd(frameDoc, bid.adId);
  } catch (error) {
    frame.remove();
    throw error;
  }
  return () => frame.remove();
}

/** A video bid is played by the site's player, so tell Prebid (and Bidio's analytics) it won. */
export function markVoxVideoBidUsed(win: Win, prebidGlobal: string, adId: string): void {
  try {
    getPbjs(win, prebidGlobal).markWinningBidAsUsed?.({ adId, analytics: true });
  } catch {
    // analytics only
  }
}
