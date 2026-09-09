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
    expect(body).toMatchObject({ success: false, vastEmpty: true, timedOut: true });
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
    expect((await res.json()).timedOut).toBe(true);
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
