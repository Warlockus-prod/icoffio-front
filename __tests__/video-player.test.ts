import { createRequire } from 'node:module';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoPlayer from '@/components/VideoPlayer';

// Reuse the DOM implementation already installed for isomorphic-dompurify.
// No browser or external ad requests are needed for the playback lifecycle.
const require = createRequire(import.meta.url);
const { JSDOM } = createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const consent = vi.hoisted(() => ({ enabled: false }));
const ads = vi.hoisted(() => ({ provider: 'vox' as 'vox' | 'prebid' }));
vi.mock('@/lib/ads-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ads-provider')>()),
  useAdsProvider: () => ads.provider,
}));
vi.mock('@/lib/useCookieConsent', () => ({
  useCookieConsent: () => ({
    consentState: { hasConsented: consent.enabled, preferences: { advertising: consent.enabled } },
  }),
}));

let dom: any;
let root: Root;
let container: HTMLDivElement;
let pixels: string[];
let fetchMock: ReturnType<typeof vi.fn>;
let playMock: ReturnType<typeof vi.spyOn>;

const tracking = {
  impression: ['https://track.example/impression'], start: ['https://track.example/start'],
  firstQuartile: ['https://track.example/q1'], midpoint: ['https://track.example/q2'],
  thirdQuartile: ['https://track.example/q3'], complete: ['https://track.example/complete'],
  skip: ['https://track.example/skip'], error: ['https://track.example/error'],
  mute: [], unmute: [], pause: [], resume: [], clickThrough: null, clickTracking: [],
};

beforeEach(() => {
  vi.useFakeTimers();
  consent.enabled = false;
  ads.provider = 'vox';
  pixels = [];
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://web.icoffio.com/pl/article/test' });
  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('navigator', dom.window.navigator);
  vi.stubGlobal('React', React);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('Image', class { set src(url: string) { pixels.push(url); } });
  playMock = vi.spyOn(dom.window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(dom.window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(dom.window.HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  fetchMock = vi.fn(async () => new Response(JSON.stringify({
    success: true, mediaUrl: 'https://media.example/ad.mp4', durationSeconds: null, tracking,
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  container = document.getElementById('root') as HTMLDivElement;
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  dom.window.close();
});

async function render(extraProps: Record<string, unknown> = {}) {
  await act(async () => root.render(React.createElement(VideoPlayer, {
    type: 'instream', position: 'article-end', adTagUrl: 'https://ssp.hybrid.ai/?test=1',
    ...extraProps,
  })));
}

async function emit(video: HTMLVideoElement, name: string) {
  await act(async () => video.dispatchEvent(new dom.window.Event(name, { bubbles: true })));
}

describe('VideoPlayer advertising consent and one-pass tracking', () => {
  it('does not render or request ads before consent, and stops when consent is withdrawn', async () => {
    await render();
    expect(container.querySelector('.video-player-container')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    consent.enabled = true;
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const video = container.querySelector('video')!;
    await emit(video, 'playing');
    expect(pixels).toEqual([tracking.impression[0], tracking.start[0]]);

    consent.enabled = false;
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(container.querySelector('video')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pixels).toEqual([tracking.impression[0], tracking.start[0]]);
  });

  it('counts impression/start only after actual playback, once across metadata changes and buffering', async () => {
    consent.enabled = true;
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(pixels).toEqual([]);

    const video = container.querySelector('video')!;
    await emit(video, 'playing');
    Object.defineProperty(video, 'duration', { value: 30, configurable: true });
    await emit(video, 'loadedmetadata');
    await emit(video, 'playing');
    expect(pixels).toEqual([tracking.impression[0], tracking.start[0]]);
    video.currentTime = 23;
    await emit(video, 'timeupdate');
    await emit(video, 'timeupdate');
    expect(pixels).toEqual([
      tracking.impression[0], tracking.start[0], tracking.firstQuartile[0],
      tracking.midpoint[0], tracking.thirdQuartile[0],
    ]);
  });

  it('fires skip without complete and does not replay the resolved auction', async () => {
    consent.enabled = true;
    await render();
    await emit(container.querySelector('video')!, 'playing');
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    const skip = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Skip ad'))!;
    await act(async () => skip.click());
    expect(pixels).toContain(tracking.skip[0]);
    expect(pixels).not.toContain(tracking.complete[0]);
    expect(container.querySelector('video')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('completes once and removes the player instead of looping an auction', async () => {
    consent.enabled = true;
    await render();
    const video = container.querySelector('video')!;
    await emit(video, 'playing');
    await emit(video, 'ended');
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(pixels.filter((url) => url === tracking.complete[0])).toHaveLength(1);
    expect(container.querySelector('video')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exhausts failing creatives without retrying them in a circle', async () => {
    consent.enabled = true;
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({
      success: true, mediaUrl: `https://media.example/ad-${fetchMock.mock.calls.length}.mp4`,
      durationSeconds: 30, tracking,
    })));
    await render({ adTagPlaylist: ['https://ssp.hybrid.ai/?test=2'] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = container.querySelector('source')!.src;
    await emit(container.querySelector('video')!, 'error');
    expect(container.querySelector('source')!.src).not.toBe(first);
    await emit(container.querySelector('video')!, 'error');
    expect(container.querySelector('video')).toBeNull();
    expect(pixels.filter((url) => url === tracking.error[0])).toHaveLength(2);
    expect(pixels).not.toContain(tracking.impression[0]);
  });

  it('on Prebid hosts plays the VAST of a Prebid vox bid instead of the DSP tag', async () => {
    consent.enabled = true;
    ads.provider = 'prebid';
    const vastXml = `<VAST version="3.0"><Ad><InLine>
      <Impression><![CDATA[https://track.example/pb-impression]]></Impression>
      <Creatives><Creative><Linear><Duration>00:00:15</Duration>
        <TrackingEvents><Tracking event="start"><![CDATA[https://track.example/pb-start]]></Tracking></TrackingEvents>
        <MediaFiles><MediaFile type="video/mp4" bitrate="900"><![CDATA[https://media.example/pb.mp4]]></MediaFile></MediaFiles>
      </Linear></Creative></Creatives></InLine></Ad></VAST>`;
    const que: Array<() => void> = [];
    que.push = (fn: () => void) => { fn(); return 0; };
    const requestBids = vi.fn(({ bidsBackHandler }: { adUnits: any[]; bidsBackHandler: () => void }) => bidsBackHandler());
    const markWinningBidAsUsed = vi.fn();
    dom.window.pbjs = {
      que,
      requestBids,
      getHighestCpmBids: () => [{ adId: 'pb-1', cpm: 5, bidder: 'vox', adUnitCode: 'x', vastXml }],
      markWinningBidAsUsed,
    };
    dom.window.__icoffioPrebidReady = true;

    await render();
    expect(fetchMock).not.toHaveBeenCalled();
    const unit = requestBids.mock.calls[0][0].adUnits[0];
    expect(unit.mediaTypes.video.context).toBe('instream');
    expect(unit.bids[0]).toEqual({ bidder: 'vox', params: { placement: 'video', placementId: '64b662024d506ede18ffa441' } });
    expect(container.querySelector('source')!.getAttribute('src')).toBe('https://media.example/pb.mp4');

    await emit(container.querySelector('video')!, 'playing');
    expect(pixels).toEqual(['https://track.example/pb-impression', 'https://track.example/pb-start']);
    expect(markWinningBidAsUsed).toHaveBeenCalledWith({ adId: 'pb-1', analytics: true });
  });
});
