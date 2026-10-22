import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// /api/video/preroll proxies a DSP VAST tag for components/VideoPlayer.tsx.
// The player gives up after 15s, but the route used to wait on the DSP with no
// limit — a slow tag was seen holding a worker for 10.5s. These tests pin the
// upstream timeout and the "client went away" cancellation.

const ORIGINAL_TIMEOUT = process.env.PREROLL_UPSTREAM_TIMEOUT_MS;
const ORIGINAL_FETCH = globalThis.fetch;

function abortError(): Error {
  return typeof DOMException !== 'undefined'
    ? new DOMException('The operation was aborted', 'AbortError')
    : Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
}

/** A fetch that never answers but honours its AbortSignal, like a stalled DSP. */
function stalledFetch() {
  return vi.fn((_url: unknown, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) return reject(abortError());
      signal?.addEventListener('abort', () => reject(abortError()), { once: true });
    })
  );
}

async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/video/preroll/route');
}

const TAG = 'https://ssp.hybrid.ai/?abc=123';

beforeEach(() => {
  process.env.PREROLL_UPSTREAM_TIMEOUT_MS = '60';
});

afterEach(() => {
  if (ORIGINAL_TIMEOUT === undefined) delete process.env.PREROLL_UPSTREAM_TIMEOUT_MS;
  else process.env.PREROLL_UPSTREAM_TIMEOUT_MS = ORIGINAL_TIMEOUT;
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('GET /api/video/preroll — upstream guard', () => {
  it('gives up on a stalled DSP tag after the upstream timeout with a 504 "no ad"', async () => {
    const fetchMock = stalledFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { GET } = await loadRoute();

    const started = Date.now();
    const res = await GET(new NextRequest(`http://localhost/api/video/preroll?tagUrl=${encodeURIComponent(TAG)}`));
    const body = await res.json();

    expect(res.status).toBe(504);
    expect(body).toMatchObject({ success: false, vastEmpty: false, timedOut: true, reason: 'upstream_timeout' });
    expect(Date.now() - started).toBeLessThan(2000);
    // The abort reached the upstream call through its signal.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it('drops the DSP call when the browser abandons the request', async () => {
    process.env.PREROLL_UPSTREAM_TIMEOUT_MS = '10000'; // timeout must not be what ends this one
    globalThis.fetch = stalledFetch() as unknown as typeof fetch;
    const { GET } = await loadRoute();

    const client = new AbortController();
    const pending = GET(
      new NextRequest(`http://localhost/api/video/preroll?tagUrl=${encodeURIComponent(TAG)}`, {
        signal: client.signal,
      })
    );
    setTimeout(() => client.abort(), 20);

    const res = await pending;
    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ timedOut: true, reason: 'client_aborted' });
  });

  it('still rejects tags outside the DSP allowlist before calling anyone', async () => {
    const fetchMock = stalledFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { GET } = await loadRoute();

    const res = await GET(new NextRequest('http://localhost/api/video/preroll?tagUrl=https%3A%2F%2Fevil.example%2Fvast'));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/video/preroll — VAST and delivery diagnostics', () => {
  async function resolve(xml: string, status = 200) {
    globalThis.fetch = vi.fn(async () => new Response(status === 204 ? null : xml, { status }));
    const { GET } = await loadRoute();
    return GET(new NextRequest(`http://localhost/api/video/preroll?tagUrl=${encodeURIComponent(TAG)}`));
  }

  it('preserves quartile tracking and accepts event attributes after other attributes', async () => {
    const res = await resolve(`<VAST version="4.1"><Ad><InLine>
      <Impression><![CDATA[https://tracker.example/impression?a=1&amp;b=2]]></Impression>
      <Creatives><Creative><Linear><Duration>00:00:30.500</Duration>
        <TrackingEvents>
          <Tracking event="start">https://tracker.example/start</Tracking>
          <Tracking id="q1" event="firstQuartile">https://tracker.example/q1</Tracking>
          <Tracking event="midpoint">https://tracker.example/q2</Tracking>
          <Tracking id="q3" event="thirdQuartile">https://tracker.example/q3</Tracking>
          <Tracking event="complete">https://tracker.example/complete</Tracking>
        </TrackingEvents>
        <MediaFiles><MediaFile type="video/mp4" bitrate="1000">https://cdn.example/ad.mp4</MediaFile></MediaFiles>
      </Linear></Creative></Creatives>
    </InLine></Ad></VAST>`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true, reason: 'filled', durationSeconds: 30.5,
      mediaUrl: 'https://cdn.example/ad.mp4',
      tracking: {
        impression: ['https://tracker.example/impression?a=1&b=2'],
        start: ['https://tracker.example/start'],
        firstQuartile: ['https://tracker.example/q1'],
        midpoint: ['https://tracker.example/q2'],
        thirdQuartile: ['https://tracker.example/q3'],
        complete: ['https://tracker.example/complete'],
      },
    });
  });

  it.each([200, 204])('reports genuine supplier no-fill (%s) separately from a timeout', async (status) => {
    const res = await resolve('<VAST version="4.1"></VAST>', status);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ success: false, vastEmpty: true, reason: 'no_fill' });
  });

  it('reports an unsupported wrapper without claiming that no ad was supplied', async () => {
    const res = await resolve('<VAST><Ad><Wrapper><VASTAdTagURI>https://other.example/vast</VASTAdTagURI></Wrapper></Ad></VAST>');
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ vastEmpty: false, reason: 'unsupported_wrapper' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not classify a non-VAST error document as no-fill', async () => {
    const res = await resolve('<html>Service unavailable</html>');
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ vastEmpty: false, reason: 'invalid_vast' });
  });

  it('never follows a supplier redirect around the outbound hostname allowlist', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, {
      status: 302, headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
    }));
    const { GET } = await loadRoute();
    const res = await GET(new NextRequest(`http://localhost/api/video/preroll?tagUrl=${encodeURIComponent(TAG)}`));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ vastEmpty: false, reason: 'blocked_redirect' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(TAG, expect.objectContaining({ redirect: 'manual' }));
  });
});
