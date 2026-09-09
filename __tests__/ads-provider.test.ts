import { describe, it, expect, afterEach } from 'vitest';
import {
  ADS_PROVIDER_FALLBACK,
  PREBID_HOSTS,
  allowsAdsOverride,
  isLocalHost,
  isPrebidEnabled,
  isVoxEnabled,
  normalizeAdsProvider,
  resolveAdsProviderForHost,
} from '@/lib/ads-provider-core';

// One container serves icoffio.com, app.icoffio.com and web.icoffio.com. A
// build-time NEXT_PUBLIC_ADS_PROVIDER=prebid (set for the web.icoffio.com Bidio
// test) switched VOX off on the main domains — no ads site-wide from the
// 2026-09-09 rebuild (v10.21.1). Resolution is per host since v10.21.2 and the
// env var can no longer override it since v10.22.4; these tests lock that in.

const ORIGINAL = process.env.NEXT_PUBLIC_ADS_PROVIDER;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_ADS_PROVIDER;
  else process.env.NEXT_PUBLIC_ADS_PROVIDER = ORIGINAL;
});

describe('resolveAdsProviderForHost — a per-host decision', () => {
  it('the main site hosts run VOX', () => {
    delete process.env.NEXT_PUBLIC_ADS_PROVIDER;
    for (const host of ['icoffio.com', 'app.icoffio.com', 'www.icoffio.com', 'localhost', '', undefined, null]) {
      expect(resolveAdsProviderForHost(host)).toBe('vox');
    }
  });

  it('the Bidio subdomain runs Prebid, whatever the case, port or whitespace', () => {
    delete process.env.NEXT_PUBLIC_ADS_PROVIDER;
    for (const host of ['web.icoffio.com', 'WEB.icoffio.com', 'web.icoffio.com:3000', ' web.icoffio.com ']) {
      expect(resolveAdsProviderForHost(host)).toBe('prebid');
    }
  });

  it('PREBID_HOSTS is the single source of which hosts get Prebid', () => {
    expect(PREBID_HOSTS).toContain('web.icoffio.com');
    for (const host of PREBID_HOSTS) expect(resolveAdsProviderForHost(host)).toBe('prebid');
  });

  it('a build-time `prebid` never switches the main site off VOX (v10.21.1 incident)', () => {
    process.env.NEXT_PUBLIC_ADS_PROVIDER = 'prebid';
    expect(resolveAdsProviderForHost('icoffio.com')).toBe('vox');
    expect(resolveAdsProviderForHost('app.icoffio.com')).toBe('vox');
    expect(resolveAdsProviderForHost('web.icoffio.com')).toBe('prebid');
  });

  it('`both` is honoured on the main site for side-by-side fill comparison', () => {
    process.env.NEXT_PUBLIC_ADS_PROVIDER = 'both';
    expect(resolveAdsProviderForHost('icoffio.com')).toBe('both');
    expect(resolveAdsProviderForHost('web.icoffio.com')).toBe('prebid');
  });

  it('garbage in the env falls back to VOX', () => {
    process.env.NEXT_PUBLIC_ADS_PROVIDER = 'gam';
    expect(ADS_PROVIDER_FALLBACK).toBe('vox');
    expect(resolveAdsProviderForHost('icoffio.com')).toBe('vox');
  });
});

describe('?ads= debug override policy', () => {
  it('is allowed on local dev and on Prebid hosts only', () => {
    // (IPv6 loopback '::1' is not recognised upstream: bareHost() splits on ':' — not asserted here.)
    for (const host of ['localhost', '127.0.0.1', 'localhost:3000', 'web.icoffio.com']) {
      expect(allowsAdsOverride(host)).toBe(true);
    }
    for (const host of ['icoffio.com', 'app.icoffio.com', 'www.icoffio.com', '', undefined]) {
      expect(allowsAdsOverride(host)).toBe(false);
    }
  });

  it('isLocalHost recognises loopback names', () => {
    expect(isLocalHost('LOCALHOST:4200')).toBe(true);
    expect(isLocalHost('icoffio.com')).toBe(false);
  });
});

describe('provider helpers', () => {
  it('normalise and map providers to the stacks they enable', () => {
    expect(normalizeAdsProvider('vox')).toBe('vox');
    expect(normalizeAdsProvider('nope')).toBeNull();
    expect(isVoxEnabled('vox')).toBe(true);
    expect(isVoxEnabled('both')).toBe(true);
    expect(isVoxEnabled('prebid')).toBe(false);
    expect(isPrebidEnabled('prebid')).toBe(true);
    expect(isPrebidEnabled('both')).toBe(true);
    expect(isPrebidEnabled('vox')).toBe(false);
  });
});
