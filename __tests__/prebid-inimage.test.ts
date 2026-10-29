import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { IN_IMAGE_PLACE_ID } from '@/lib/config/adPlacements';
import {
  buildInImageAdUnit,
  isInImageSizeEligible,
  resolveInImageUrl,
  startPrebidInImage,
} from '@/lib/prebid-inimage';

const projectRequire = createRequire(import.meta.url);
const { JSDOM } = createRequire(projectRequire.resolve('isomorphic-dompurify'))('jsdom');

const PAGE = 'https://web.icoffio.com/en/article/one';

describe('in-image ad unit for the Prebid vox bidder', () => {
  it('matches the adapter contract: banner + placement inImage + imageUrl', () => {
    const unit = buildInImageAdUnit('icoffio-inimage-1', 'https://example.com/a.jpg');
    expect(unit.mediaTypes.banner.sizes).toEqual([[0, 0]]);
    expect(unit.bids).toEqual([{
      bidder: 'vox',
      params: { placement: 'inImage', placementId: IN_IMAGE_PLACE_ID, imageUrl: 'https://example.com/a.jpg' },
    }]);
  });

  it('sends the SSP the original photo, not the Next.js image proxy', () => {
    const proxied = '/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1%3Fw%3D1080&w=1200&q=75';
    expect(resolveInImageUrl(proxied, PAGE)).toBe('https://images.unsplash.com/photo-1?w=1080');
    expect(resolveInImageUrl('/images/a.jpg', PAGE)).toBe('https://web.icoffio.com/images/a.jpg');
    expect(resolveInImageUrl('data:image/png;base64,xx', PAGE)).toBeNull();
    expect(resolveInImageUrl('', PAGE)).toBeNull();
  });

  it('skips photos too small to carry the stripe', () => {
    expect(isInImageSizeEligible(992, 558)).toBe(true);
    expect(isInImageSizeEligible(280, 558)).toBe(false);
    expect(isInImageSizeEligible(992, 150)).toBe(false);
  });
});

describe('startPrebidInImage', () => {
  let win: any;
  let doc: Document;
  let stop: (() => void) | undefined;
  let observed: Element[];
  let intersect: (target: Element) => void;
  let pbjs: any;

  beforeEach(() => {
    const dom = new JSDOM('<main><article></article></main>', { url: PAGE, pretendToBeVisual: true });
    win = dom.window;
    doc = win.document;
    observed = [];
    let callback: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void = () => {};
    win.IntersectionObserver = class {
      constructor(cb: typeof callback) { callback = cb; }
      observe(el: Element) { observed.push(el); }
      unobserve(el: Element) { observed = observed.filter((o) => o !== el); }
      disconnect() { observed = []; }
    };
    intersect = (target) => callback([{ isIntersecting: true, target }]);
    // Loaded Prebid keeps `que` an array but runs pushed callbacks at once.
    const que: Array<() => void> = [];
    que.push = (fn: () => void) => { fn(); return 0; };
    pbjs = {
      que,
      requestBids: vi.fn(),
      getHighestCpmBids: vi.fn(() => []),
      renderAd: vi.fn(),
    };
    win.pbjs = pbjs;
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  function hero(width = 992, height = 558) {
    const wrapper = doc.createElement('div');
    const image = doc.createElement('img');
    image.dataset.articleImage = '1';
    image.src = '/_next/image?url=https%3A%2F%2Fexample.com%2Fhero.jpg&w=1200&q=75';
    for (const [key, value] of Object.entries({
      complete: true, naturalWidth: 1200, offsetWidth: width, offsetHeight: height, offsetTop: 0, offsetLeft: 0,
    })) Object.defineProperty(image, key, { configurable: true, value });
    wrapper.append(image);
    doc.querySelector('article')!.append(wrapper);
    return image;
  }

  function start(pathname = '/en/article/one') {
    stop = startPrebidInImage({ window: win, document: doc, pathname, prebidGlobal: 'pbjs', onError: () => {} });
  }

  it('runs one auction per photo when it comes into view', () => {
    const image = hero();
    start();
    expect(observed).toContain(image);
    expect(pbjs.requestBids).not.toHaveBeenCalled();

    intersect(image);
    intersect(image);
    expect(pbjs.requestBids).toHaveBeenCalledTimes(1);
    const request = pbjs.requestBids.mock.calls[0][0];
    expect(request.adUnits[0].bids[0].params).toEqual({
      placement: 'inImage', placementId: IN_IMAGE_PLACE_ID, imageUrl: 'https://example.com/hero.jpg',
    });
  });

  it('renders a winning bid into a frame laid over the photo', () => {
    const image = hero();
    start();
    intersect(image);
    const { adUnits, bidsBackHandler } = pbjs.requestBids.mock.calls[0][0];
    const code = adUnits[0].code;
    pbjs.getHighestCpmBids.mockReturnValue([{ adId: 'ad-1', cpm: 3, bidder: 'vox', adUnitCode: code }]);
    bidsBackHandler();

    const frame = image.parentElement!.querySelector<HTMLIFrameElement>(`iframe#${code}`)!;
    expect(frame).not.toBeNull();
    // The adapter's creative finds its frame by window.name and stretches it.
    expect(frame.name).toBe(code);
    const box = frame.parentElement!;
    expect(box.style.width).toBe('992px');
    expect(box.style.height).toBe('558px');
    expect(image.parentElement!.style.position).toBe('relative');
    expect(pbjs.renderAd).toHaveBeenCalledWith(frame.contentDocument, 'ad-1');

    stop!();
    stop = undefined;
    expect(image.parentElement!.querySelector('iframe')).toBeNull();
  });

  it('leaves the photo untouched without a bid', () => {
    const image = hero();
    start();
    intersect(image);
    pbjs.requestBids.mock.calls[0][0].bidsBackHandler();
    expect(image.parentElement!.querySelector('iframe')).toBeNull();
    expect(pbjs.renderAd).not.toHaveBeenCalled();
  });

  it('ignores small photos and non-article pages', () => {
    const small = hero(250, 140);
    start();
    intersect(small);
    expect(pbjs.requestBids).not.toHaveBeenCalled();
    stop!();

    const image = hero();
    start('/en/category/tech');
    intersect(image);
    expect(pbjs.requestBids).not.toHaveBeenCalled();
  });
});
