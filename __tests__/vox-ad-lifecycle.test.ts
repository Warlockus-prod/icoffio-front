import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { CONSENT_KEY, CONSENT_VERSION } from '@/lib/consent-storage';
import { startVoxAdLifecycle } from '@/lib/vox-ad-lifecycle';

// Reuse the DOM runtime already shipped by isomorphic-dompurify. No browser
// network or real ad auctions are needed to exercise the SDK timing contract.
const projectRequire = createRequire(import.meta.url);
const { JSDOM } = createRequire(projectRequire.resolve('isomorphic-dompurify'))('jsdom');

let dom: any;
let win: Window & typeof globalThis;
let doc: Document;
let stop: (() => void) | undefined;

function consent(advertising = true) {
  win.localStorage.setItem(CONSENT_KEY, JSON.stringify({
    version: CONSENT_VERSION,
    hasConsented: true,
    expiryDate: Date.now() + 86_400_000,
    preferences: { necessary: true, analytics: false, advertising },
  }));
}

function start(pathname = '/en/article/one') {
  stop = startVoxAdLifecycle({ window: win, document: doc, pathname, displayPlaceIds: new Set(['display']) });
}

function hero(parent = doc.querySelector('article')!) {
  const wrapper = doc.createElement('div');
  const image = doc.createElement('img');
  image.dataset.articleImage = '1';
  image.src = 'https://example.com/photo.jpg';
  Object.defineProperty(image, 'complete', { configurable: true, value: true });
  Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1200 });
  wrapper.append(image);
  parent.append(wrapper);
  return image;
}

function sdkReady() {
  const queued = win._tx?.cmds || [];
  const sdk = {
    cmds: queued,
    integrateInImage: vi.fn((_options: { image: HTMLImageElement; placeId: string }) => undefined),
    init: vi.fn(() => {
      doc.querySelectorAll<HTMLElement>('[data-hyb-ssp-ad-place]').forEach((slot) => {
        slot.dataset.hybSspAdPlaceStatus = 'init';
      });
    }),
  };
  win._tx = sdk;
  while (queued.length) queued.shift()();
  return sdk;
}

beforeEach(() => {
  vi.useFakeTimers();
  dom = new JSDOM('<!doctype html><html><head></head><body><main><article></article></main></body></html>', {
    url: 'https://app.icoffio.com/en/article/one',
  });
  win = dom.window;
  doc = win.document;
  consent();
});

afterEach(() => {
  stop?.();
  stop = undefined;
  dom.window.close();
  vi.useRealTimers();
});

describe('VOX lifecycle', () => {
  it('watches late images after the first consent loads an asynchronous SDK', async () => {
    start();
    expect(doc.querySelectorAll('script[data-vox-ssp="1"]')).toHaveLength(1);
    const sdk = sdkReady();
    expect(sdk.integrateInImage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000); // original fixed retries have ended
    const image = hero();
    await vi.advanceTimersByTimeAsync(150);
    expect(sdk.integrateInImage).toHaveBeenCalledTimes(1);
    expect(sdk.integrateInImage.mock.calls[0][0]).toMatchObject({ image, placeId: '63d93bb54d506e95f039e2e3' });
  });

  it('registers existing images once despite retries, loads, resize and remount', async () => {
    const image = hero();
    const sdk = sdkReady();
    start();
    image.dispatchEvent(new win.Event('load'));
    win.dispatchEvent(new win.Event('resize'));
    await vi.advanceTimersByTimeAsync(3000);
    stop?.();
    start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(sdk.integrateInImage).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    // Keep provider-side size/targeting checks enabled.
    expect(sdk.integrateInImage.mock.calls[0][0]).not.toHaveProperty('checkSize');
  });

  it('does not retain or execute a queued callback from an obsolete route', () => {
    hero();
    start();
    const oldCallback = win._tx.cmds[0];
    stop?.();
    expect(win._tx.cmds).toHaveLength(0);
    const sdk = sdkReady();
    oldCallback();
    expect(sdk.integrateInImage).not.toHaveBeenCalled();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('registers new article image nodes during SPA navigation', () => {
    const first = hero();
    const sdk = sdkReady();
    start();
    stop?.();
    doc.querySelector('article')!.replaceChildren();
    const second = hero();
    start('/pl/article/two');
    expect(sdk.integrateInImage.mock.calls.map((call) => call[0].image)).toEqual([first, second]);
  });

  it('does not load the SDK or initialize ads after rejected consent', async () => {
    consent(false);
    hero();
    start();
    expect(doc.querySelector('script[data-vox-ssp="1"]')).toBeNull();
    const sdk = sdkReady();
    await vi.advanceTimersByTimeAsync(3000);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.integrateInImage).not.toHaveBeenCalled();
  });

  it('rechecks consent before queued SDK execution and later mutations', async () => {
    hero();
    start();
    consent(false);
    const sdk = sdkReady();
    hero();
    await vi.advanceTimersByTimeAsync(3000);
    expect(sdk.integrateInImage).not.toHaveBeenCalled();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('excludes related thumbnails and images injected into ad containers', async () => {
    const article = doc.querySelector('article')!;
    const prose = doc.createElement('div');
    prose.className = 'prose';
    article.append(prose);
    const eligible = hero(prose);
    const related = doc.createElement('div');
    related.dataset.relatedArticles = '1';
    prose.append(related);
    hero(related);
    const ad = doc.createElement('div');
    ad.dataset.hybSspAdPlace = 'unknown-ad';
    prose.append(ad);
    hero(ad);
    const overlay = doc.createElement('div');
    overlay.setAttribute('data-hyb-ssp-in-image-overlay', 'inimage');
    prose.append(overlay);
    hero(overlay);
    const sdk = sdkReady();
    start();
    hero(ad);
    await vi.advanceTimersByTimeAsync(3000);
    expect(sdk.integrateInImage).toHaveBeenCalledTimes(1);
    expect(sdk.integrateInImage.mock.calls[0][0].image).toBe(eligible);
  });

  it('picks up a previously broken image when its later load succeeds', async () => {
    const image = hero();
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 0 });
    const sdk = sdkReady();
    start();
    expect(sdk.integrateInImage).not.toHaveBeenCalled();
    Object.defineProperty(image, 'naturalWidth', { value: 1200 });
    image.dispatchEvent(new win.Event('load'));
    await vi.advanceTimersByTimeAsync(150);
    expect(sdk.integrateInImage).toHaveBeenCalledTimes(1);
  });

  it('initializes a display container inserted after the initial retry window', async () => {
    const sdk = sdkReady();
    start('/en');
    await vi.advanceTimersByTimeAsync(3000);
    const slot = doc.createElement('div');
    slot.dataset.hybSspAdPlace = 'display';
    slot.getClientRects = () => ({ length: 1 } as DOMRectList);
    doc.querySelector('main')!.append(slot);
    await vi.advanceTimersByTimeAsync(150);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.integrateInImage).not.toHaveBeenCalled();
    win.dispatchEvent(new win.Event('resize'));
    await vi.advanceTimersByTimeAsync(150);
    expect(sdk.init).toHaveBeenCalledTimes(1);
  });
});
