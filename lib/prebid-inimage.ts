/**
 * VOX in-image through Prebid (web.icoffio.com).
 *
 * On VOX hosts in-image runs through the VOX SDK (`_tx.integrateInImage`, see
 * vox-ad-lifecycle.ts). On Prebid hosts the same Hybrid demand is bought through
 * the `vox` bidder that ships in Bidio's Prebid build, so in-image appears in the
 * Prebid auction and in Bidio's analytics like display does.
 *
 * Adapter contract (files.bidio.pl/prebid.js, voxBidAdapter; docs.prebid.org/dev-docs/bidders/vox):
 *   mediaTypes.banner + params { placement: 'inImage', placementId, imageUrl }
 *   → POST https://ssp.hybrid.ai/auction/prebid
 *   → bid.ad is a document that loads st.hybrid.ai/prebidrenderer.js and calls
 *     `_hyb_prebid_ssp.registerInImage`, drawing the overlay inside its own
 *     frame and stretching that frame (looked up by window.name) to 100% × 100%.
 *
 * So each photo gets its own auction, and a winning bid is rendered into an
 * iframe laid exactly over the photo. Bidio's lazy SDK has no in-image slot type
 * and no GPT slot is involved: the auction runs on Bidio's pbjs instance with
 * explicit `adUnits`, which keeps the unit out of Bidio's own requestBids calls.
 *
 * Viewability is the same geometry rule as direct VOX: the renderer counts a
 * view at >99% of the overlay frame (= the photo) on screen for 1 s.
 */

import { IN_IMAGE_PLACE_ID } from './config/adPlacements';
import { ARTICLE_IMAGE_SELECTOR, EXCLUDED_IMAGE_ANCESTORS } from './vox-ad-lifecycle';

export const PREBID_INIMAGE_CODE_PREFIX = 'icoffio-inimage-';
/** Prebid auction timeout for one photo. Bidio uses 1000 ms for display. */
export const PREBID_INIMAGE_TIMEOUT_MS = 1500;
/** Smaller photos cannot carry the ~120–200 px VOX stripe. */
export const PREBID_INIMAGE_MIN_WIDTH = 300;
export const PREBID_INIMAGE_MIN_HEIGHT = 200;

const OVERLAY_ATTR = 'data-prebid-inimage';

/**
 * The URL the SSP should see for a photo: the original behind a Next.js
 * `/_next/image?url=…` proxy, otherwise the absolute rendered URL.
 */
export function resolveInImageUrl(src: string, pageUrl: string): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, pageUrl);
    if (url.pathname === '/_next/image') {
      const original = url.searchParams.get('url');
      if (original) return new URL(original, pageUrl).href;
    }
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** One Prebid ad unit per photo, in the shape the vox adapter validates. */
export function buildInImageAdUnit(code: string, imageUrl: string) {
  return {
    code,
    mediaTypes: { banner: { sizes: [[0, 0]] } },
    bids: [{
      bidder: 'vox',
      params: { placement: 'inImage', placementId: IN_IMAGE_PLACE_ID, imageUrl },
    }],
  };
}

export function isInImageSizeEligible(width: number, height: number): boolean {
  return width >= PREBID_INIMAGE_MIN_WIDTH && height >= PREBID_INIMAGE_MIN_HEIGHT;
}

interface PrebidBid {
  adId: string;
  cpm: number;
  bidder: string;
  adUnitCode: string;
}

interface Pbjs {
  que: Array<() => void>;
  requestBids?: (request: {
    adUnits: ReturnType<typeof buildInImageAdUnit>[];
    timeout: number;
    bidsBackHandler: () => void;
  }) => void;
  getHighestCpmBids?: (adUnitCode: string) => PrebidBid[];
  renderAd?: (doc: Document, adId: string) => void;
}

interface PrebidInImageOptions {
  window: Window & typeof globalThis;
  document: Document;
  pathname: string;
  prebidGlobal: string;
  onError?: (error: unknown) => void;
}

/** Run one in-image auction per eligible article photo; returns a cleanup. */
export function startPrebidInImage({
  window: win,
  document: doc,
  pathname,
  prebidGlobal,
  onError = (error) => console.error('[Bidio] in-image error:', error),
}: PrebidInImageOptions): () => void {
  if (!pathname.includes('/article/')) return () => {};

  let active = true;
  let counter = 0;
  const requested = new WeakSet<HTMLImageElement>();
  const overlays: Array<{ box: HTMLElement; stop: () => void }> = [];

  const pbjs = (): Pbjs => {
    const holder = win as unknown as Record<string, Pbjs | undefined>;
    const instance = holder[prebidGlobal] || (holder[prebidGlobal] = { que: [] } as Pbjs);
    if (!Array.isArray(instance.que)) instance.que = [];
    return instance;
  };

  const candidate = (image: HTMLImageElement) => (
    image.matches(ARTICLE_IMAGE_SELECTOR) &&
    !image.closest(EXCLUDED_IMAGE_ANCESTORS) &&
    !image.closest(`[${OVERLAY_ATTR}]`) &&
    !requested.has(image)
  );

  // Lay a box exactly over the photo and keep it there. The renderer stretches
  // its frame to 100% of the frame's parent, so the parent must be this box,
  // not the photo's container (which can also hold a caption).
  const placeOverlay = (image: HTMLImageElement, code: string) => {
    const host = image.parentElement;
    if (!host) return null;
    if (win.getComputedStyle(host).position === 'static') host.style.position = 'relative';

    const box = doc.createElement('div');
    box.setAttribute(OVERLAY_ATTR, code);
    box.style.cssText = 'position:absolute;z-index:2;overflow:hidden;pointer-events:none;';
    const frame = doc.createElement('iframe');
    frame.id = code;
    frame.name = code;
    frame.title = 'Advertisement';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('allowtransparency', 'true');
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent;pointer-events:auto;';
    box.appendChild(frame);

    const sync = () => {
      box.style.top = `${image.offsetTop}px`;
      box.style.left = `${image.offsetLeft}px`;
      box.style.width = `${image.offsetWidth}px`;
      box.style.height = `${image.offsetHeight}px`;
    };
    sync();
    host.appendChild(box);
    const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(sync) : null;
    resize?.observe(image);
    win.addEventListener('resize', sync);
    const stop = () => {
      resize?.disconnect();
      win.removeEventListener('resize', sync);
    };
    overlays.push({ box, stop });
    return { box, frame, stop };
  };

  const runAuction = (image: HTMLImageElement) => {
    if (!active || !candidate(image)) return;
    if (!isInImageSizeEligible(image.offsetWidth, image.offsetHeight)) return;
    const imageUrl = resolveInImageUrl(image.currentSrc || image.src, win.location.href);
    if (!imageUrl) return;
    requested.add(image);
    const code = `${PREBID_INIMAGE_CODE_PREFIX}${++counter}`;
    const unit = buildInImageAdUnit(code, imageUrl);

    pbjs().que.push(() => {
      const instance = pbjs();
      if (!active || !instance.requestBids) return;
      instance.requestBids({
        adUnits: [unit],
        timeout: PREBID_INIMAGE_TIMEOUT_MS,
        bidsBackHandler: () => {
          if (!active || !image.isConnected) return;
          const bid = instance.getHighestCpmBids?.(code)?.[0];
          if (!bid || !instance.renderAd) {
            console.log(`[Bidio] in-image ${code}: no bid`);
            return;
          }
          const overlay = placeOverlay(image, code);
          const frameDoc = overlay?.frame.contentDocument;
          if (!overlay || !frameDoc) return;
          try {
            instance.renderAd!(frameDoc, bid.adId);
            console.log(`[Bidio] in-image ${code}: ${bid.bidder} ${bid.cpm} rendered`);
          } catch (error) {
            overlay.stop();
            overlay.box.remove();
            onError(error);
          }
        },
      });
    });
  };

  // One auction per photo, when it is about to be seen — not for every photo
  // of a long article at page load.
  const visibility = new win.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const image = entry.target as HTMLImageElement;
      if (!image.complete || image.naturalWidth === 0) return;
      visibility.unobserve(image);
      runAuction(image);
    });
  }, { rootMargin: '300px 0px' });

  const watch = (image: HTMLImageElement) => {
    if (candidate(image)) visibility.observe(image);
  };
  const scan = () => doc.querySelectorAll<HTMLImageElement>(ARTICLE_IMAGE_SELECTOR).forEach(watch);

  // A photo observed before it loaded reported 0×0; observe it again once it has a size.
  const onLoad = (event: Event) => {
    const target = event.target;
    if (target instanceof win.HTMLImageElement && candidate(target)) {
      visibility.unobserve(target);
      visibility.observe(target);
    }
  };
  doc.addEventListener('load', onLoad, true);
  const mutations = new win.MutationObserver(scan);
  mutations.observe(doc.body, { childList: true, subtree: true });
  scan();

  return () => {
    active = false;
    visibility.disconnect();
    mutations.disconnect();
    doc.removeEventListener('load', onLoad, true);
    overlays.forEach(({ box, stop }) => {
      stop();
      box.remove();
    });
  };
}
