import { createRequire } from 'node:module';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { outcomeFromVoxStatus, describeAdElement, startAdTelemetry } from '@/lib/ad-telemetry';

const projectRequire = createRequire(import.meta.url);
const { JSDOM } = createRequire(projectRequire.resolve('isomorphic-dompurify'))('jsdom');

afterEach(() => { vi.useRealTimers(); });

describe('ad telemetry', () => {
  it('maps VOX statuses to outcomes and ignores intermediate ones', () => {
    expect(outcomeFromVoxStatus('display')).toBe('filled');
    expect(outcomeFromVoxStatus('empty')).toBe('empty');
    expect(outcomeFromVoxStatus('ready')).toBeNull();
    expect(outcomeFromVoxStatus(null)).toBeNull();
  });

  it('reports each container once, in one batched beacon', async () => {
    const dom = new JSDOM('<!doctype html><body><div id="d" data-hyb-ssp-ad-place="P1" data-ad-format="970x250"></div><div id="i" data-hyb-ssp-in-image-overlay="IMG"></div></body>', { url: 'https://icoffio.com/en' });
    const win = dom.window as any;
    const sent: string[] = [];
    win.navigator.sendBeacon = (_url: string, body: string) => { sent.push(body); return true; };
    win.setTimeout = (fn: () => void) => { setTimeout(fn, 0); return 1; };
    const stop = startAdTelemetry(win, win.document);
    const d = win.document.getElementById('d');
    const i = win.document.getElementById('i');
    expect(describeAdElement(i)).toEqual({ placeId: 'IMG', format: 'in-image' });
    d.setAttribute('data-hyb-ssp-ad-place-status', 'display');
    i.setAttribute('data-hyb-ssp-ad-place-status', 'empty');
    await new Promise((r) => setTimeout(r, 0));
    d.setAttribute('data-hyb-ssp-ad-place-status', 'empty'); // already counted: ignored
    await new Promise((r) => setTimeout(r, 20));
    stop();
    expect(sent).toHaveLength(1);
    const payload = JSON.parse(sent[0]);
    expect(payload.events).toEqual([
      { placeId: 'P1', format: '970x250', outcome: 'filled' },
      { placeId: 'IMG', format: 'in-image', outcome: 'empty' },
    ]);
  });
});
