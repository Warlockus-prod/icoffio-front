import { createRequire } from 'node:module';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UniversalAd } from '@/components/UniversalAd';

const projectRequire = createRequire(import.meta.url);
const { JSDOM } = createRequire(projectRequire.resolve('isomorphic-dompurify'))('jsdom');

vi.mock('@/lib/ads-provider', () => ({
  useAdsProvider: () => 'vox',
  isVoxEnabled: () => true,
}));

let dom: any;
let root: Root;
let container: HTMLDivElement;
let slot: HTMLDivElement;

beforeEach(async () => {
  vi.useFakeTimers();
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://icoffio.com/en' });
  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('navigator', dom.window.navigator);
  vi.stubGlobal('MutationObserver', dom.window.MutationObserver);
  vi.stubGlobal('React', React);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.getElementById('root') as HTMLDivElement;
  root = createRoot(container);
  await act(async () => root.render(React.createElement(UniversalAd, {
    placeId: 'test-display', format: '300x250',
  })));
  slot = container.querySelector('[data-hyb-ssp-ad-place]')!;
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  dom.window.close();
});

async function flushMutations() {
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(200);
  });
}

function iframe(width: number, height: number) {
  const frame = document.createElement('iframe');
  frame.width = String(width);
  frame.height = String(height);
  return frame;
}

describe('UniversalAd creative visibility and supplier no-fill', () => {
  it('reports SDK no-fill immediately and can still display a later creative', async () => {
    slot.dataset.hybSspAdPlaceStatus = 'empty';
    await flushMutations();
    expect(slot.dataset.adStatus).toBe('empty');
    expect(slot.style.opacity).toBe('0');

    slot.append(iframe(300, 250));
    await flushMutations();
    expect(slot.dataset.adStatus).toBe('ready');
    expect(slot.style.opacity).toBe('1');
  });

  it('shows the real banner when a tracking iframe precedes it', async () => {
    slot.append(iframe(1, 1), iframe(336, 280));
    await flushMutations();
    expect(slot.dataset.adStatus).toBe('ready');
    expect(slot.style.opacity).toBe('1');
  });

  it('keeps a tracking-only slot hidden until a real creative arrives', async () => {
    slot.append(iframe(1, 1));
    await flushMutations();
    expect(slot.dataset.adStatus).toBe('unsuitable');
    expect(slot.style.opacity).toBe('0');

    slot.append(iframe(300, 250));
    await flushMutations();
    expect(slot.dataset.adStatus).toBe('ready');
  });
});

describe('UniversalAd breakpoint gating', () => {
  // _tx.init() registers every [data-hyb-ssp-ad-place] on the page by itself, so
  // a slot inside a display:none breakpoint wrapper (mobile 320×50 on desktop,
  // desktop 970×250 on mobile) used to win an auction nobody could see.
  async function renderInWrapper(wrapperStyle: string) {
    const host = document.createElement('div');
    host.setAttribute('style', wrapperStyle);
    document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => r.render(React.createElement(UniversalAd, {
      placeId: 'hidden-display', format: '320x50',
    })));
    return { host, r };
  }

  it('does not expose a VOX slot inside a hidden wrapper', async () => {
    const { host, r } = await renderInWrapper('display:none');
    expect(host.querySelector('[data-hyb-ssp-ad-place]')).toBeNull();
    expect(host.querySelector('[data-vox-slot-pending="320x50"]')).not.toBeNull();
    await act(async () => r.unmount());
  });

  it('exposes the slot once the wrapper becomes visible (breakpoint change)', async () => {
    const { host, r } = await renderInWrapper('display:none');
    host.setAttribute('style', 'display:block');
    await act(async () => { window.dispatchEvent(new window.Event('resize')); });
    expect(host.querySelector('[data-hyb-ssp-ad-place="hidden-display"]')).not.toBeNull();
    await act(async () => r.unmount());
  });

  it('renders the slot straight away when nothing hides it', () => {
    expect(slot).not.toBeNull();
    expect(slot.getAttribute('data-hyb-ssp-ad-place')).toBe('test-display');
  });
});

describe('UniversalAd lazy mount', () => {
  // VOX bills a display impression when the creative loads; a billboard far below
  // the fold must not enter the auction until the reader approaches it.
  let observers: Array<{ callback: (entries: Array<{ isIntersecting: boolean }>) => void; options: any; disconnected: boolean }>;

  beforeEach(() => {
    observers = [];
    (window as any).IntersectionObserver = class {
      record: (typeof observers)[number];
      constructor(callback: any, options: any) {
        this.record = { callback, options, disconnected: false };
        observers.push(this.record);
      }
      observe() {}
      disconnect() { this.record.disconnected = true; }
    };
  });

  async function renderLazy(wrapperStyle = 'display:block') {
    const host = document.createElement('div');
    host.setAttribute('style', wrapperStyle);
    document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => r.render(React.createElement(UniversalAd, {
      placeId: 'below-fold', format: '970x250',
    })));
    return { host, r };
  }

  it('waits until the slot is near the viewport', async () => {
    const { host, r } = await renderLazy();
    expect(host.querySelector('[data-hyb-ssp-ad-place]')).toBeNull();
    expect(observers.at(-1)!.options.rootMargin).toBe('300px 0px');

    await act(async () => observers.at(-1)!.callback([{ isIntersecting: false }]));
    expect(host.querySelector('[data-hyb-ssp-ad-place]')).toBeNull();

    await act(async () => observers.at(-1)!.callback([{ isIntersecting: true }]));
    expect(host.querySelector('[data-hyb-ssp-ad-place="below-fold"]')).not.toBeNull();
    expect(observers.at(-1)!.disconnected).toBe(true);
    await act(async () => r.unmount());
  });

  it('still keeps a slot under a hidden breakpoint wrapper out of the DOM', async () => {
    const { host, r } = await renderLazy('display:none');
    await act(async () => observers.at(-1)!.callback([{ isIntersecting: true }]));
    expect(host.querySelector('[data-hyb-ssp-ad-place]')).toBeNull();
    await act(async () => r.unmount());
  });
});
