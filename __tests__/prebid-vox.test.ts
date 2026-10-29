import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { AD_PLACEMENTS, VIDEO_PLACE_ID } from '@/lib/config/adPlacements';
import {
  buildVoxBannerUnit,
  buildVoxVideoUnit,
  markPrebidReady,
  onPrebidReady,
  renderVoxBanner,
  requestVoxBid,
} from '@/lib/prebid-vox';
import { parseInlineVast } from '@/lib/vast';

const projectRequire = createRequire(import.meta.url);
const { JSDOM } = createRequire(projectRequire.resolve('isomorphic-dompurify'))('jsdom');

describe('vox bidder units', () => {
  it('banner and video match the adapter contract', () => {
    expect(buildVoxBannerUnit('c1', 'place', [300, 250])).toEqual({
      code: 'c1',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      bids: [{ bidder: 'vox', params: { placement: 'banner', placementId: 'place' } }],
    });
    const video = buildVoxVideoUnit('c2', VIDEO_PLACE_ID);
    // isBidRequestValid: context instream|outstream and an array playerSize.
    // Outstream with a url-less renderer: Prebid keeps a vastXml-only bid without a cache.
    expect(video.mediaTypes.video.context).toBe('outstream');
    expect(typeof video.mediaTypes.video.renderer.render).toBe('function');
    expect('url' in video.mediaTypes.video.renderer).toBe(false);
    expect(video.mediaTypes.video.playerSize).toEqual([[640, 360]]);
    expect(video.bids[0].params).toEqual({ placement: 'video', placementId: VIDEO_PLACE_ID });
  });

  it('keeps places that share a spot with a Bidio slot off the Prebid path', () => {
    const viaPrebid = AD_PLACEMENTS.filter((ad) => ad.prebid).map((ad) => ad.id).sort();
    expect(viaPrebid).toEqual([
      'homepage-desktop-1', 'homepage-mobile-1', 'mobile-1', 'mobile-2', 'mobile-interstitial', 'sidebar-1', 'sidebar-2',
    ]);
  });
});

describe('auctions on the Bidio pbjs instance', () => {
  let win: any;
  let pbjs: any;

  beforeEach(() => {
    win = new JSDOM('<div id="slot"></div>', { url: 'https://web.icoffio.com/en/article/a', pretendToBeVisual: true }).window;
    const que: Array<() => void> = [];
    que.push = (fn: () => void) => { fn(); return 0; };
    pbjs = { que, requestBids: vi.fn(), getHighestCpmBids: vi.fn(() => []), renderAd: vi.fn() };
    win.pbjs = pbjs;
  });

  it('waits for the Bidio SDK before the first auction', () => {
    const calls: string[] = [];
    onPrebidReady(win, () => calls.push('early'));
    expect(calls).toEqual([]);
    markPrebidReady(win);
    onPrebidReady(win, () => calls.push('late'));
    expect(calls).toEqual(['early', 'late']);
  });

  it('resolves the highest bid for the unit, or null on no bid', async () => {
    pbjs.requestBids.mockImplementation(({ bidsBackHandler }: any) => bidsBackHandler());
    const unit = buildVoxBannerUnit('icoffio-vox-banner-x', 'place', [300, 600]);
    expect(await requestVoxBid(win, 'pbjs', unit)).toBeNull();
    expect(pbjs.requestBids.mock.calls[0][0].adUnits).toEqual([unit]);

    pbjs.getHighestCpmBids.mockReturnValue([{ adId: 'a1', cpm: 3, bidder: 'vox', adUnitCode: unit.code }]);
    expect(await requestVoxBid(win, 'pbjs', unit)).toMatchObject({ adId: 'a1', cpm: 3 });
    expect(pbjs.getHighestCpmBids).toHaveBeenLastCalledWith(unit.code);
  });

  it('gives up when Prebid never answers', async () => {
    vi.useFakeTimers();
    try {
      const pending = requestVoxBid(win, 'pbjs', { code: 'c' }, 100);
      vi.advanceTimersByTime(5200);
      expect(await pending).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders a banner bid into a frame of the place size and removes it on cleanup', () => {
    const slot = win.document.getElementById('slot');
    const remove = renderVoxBanner(win, win.document, 'pbjs',
      { adId: 'a1', cpm: 2, bidder: 'vox', adUnitCode: 'icoffio-vox-banner-1' }, slot, [300, 250]);
    const frame = slot.querySelector('iframe');
    expect(frame.name).toBe('icoffio-vox-banner-1');
    expect([frame.width, frame.height]).toEqual(['300', '250']);
    expect(pbjs.renderAd).toHaveBeenCalledWith(frame.contentDocument, 'a1');
    remove!();
    expect(slot.querySelector('iframe')).toBeNull();
  });
});

describe('inline VAST from a vox video bid', () => {
  it('picks the mp4, duration and tracking', () => {
    const parsed = parseInlineVast(`<?xml version="1.0" encoding="utf-16"?><VAST version="3.0">
      <Error><![CDATA[https://ssp.example/err]]></Error><Ad id="1"><InLine>
      <Impression><![CDATA[https://dsp.example/imp]]></Impression>
      <Creatives><Creative><Linear skipoffset="00:00:05"><Duration>00:00:15</Duration>
      <MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="10152"><![CDATA[https://cdn.example/a.mp4]]></MediaFile></MediaFiles>
      <TrackingEvents><Tracking event="complete"><![CDATA[https://dsp.example/complete]]></Tracking></TrackingEvents>
      </Linear></Creative></Creatives></InLine></Ad></VAST>`);
    expect(parsed).toMatchObject({
      ok: true, mediaUrl: 'https://cdn.example/a.mp4', durationSeconds: 15,
      tracking: { impression: ['https://dsp.example/imp'], complete: ['https://dsp.example/complete'], error: ['https://ssp.example/err'] },
    });
    expect(parseInlineVast('<VAST version="4.1"></VAST>')).toEqual({ ok: false, reason: 'no_fill' });
  });
});
