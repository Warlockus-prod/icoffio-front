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
