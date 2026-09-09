import { describe, it, expect, vi } from 'vitest';
import vm from 'node:vm';
import {
  CONSENT_EXPIRY_DAYS,
  CONSENT_KEY,
  CONSENT_VERSION,
  REJECT_EXPIRY_DAYS,
  VOX_SDK_URL,
  buildEarlyVoxLoaderScript,
  consentExpiryMs,
  hasAdvertisingConsent,
  readStoredConsent,
} from '@/lib/consent-storage';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function record(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    hasConsented: true,
    timestamp: NOW - 1000,
    preferences: { necessary: true, analytics: true, advertising: true },
    version: CONSENT_VERSION,
    expiryDate: NOW + 100 * DAY,
    ...overrides,
  });
}

describe('readStoredConsent', () => {
  it('returns null for missing or malformed records', () => {
    expect(readStoredConsent(null, NOW)).toBeNull();
    expect(readStoredConsent('', NOW)).toBeNull();
    expect(readStoredConsent('{not json', NOW)).toBeNull();
    expect(readStoredConsent('"a string"', NOW)).toBeNull();
  });

  it('rejects an old version or an expired record', () => {
    expect(readStoredConsent(record({ version: '0.9' }), NOW)).toBeNull();
    expect(readStoredConsent(record({ expiryDate: NOW - 1 }), NOW)).toBeNull();
  });

  it('reads a valid grant and a valid refusal', () => {
    const grant = readStoredConsent(record(), NOW);
    expect(grant).toEqual({
      hasConsented: true,
      timestamp: NOW - 1000,
      preferences: { necessary: true, analytics: true, advertising: true },
    });

    const refusal = readStoredConsent(
      record({ preferences: { necessary: true, analytics: false, advertising: false } }),
      NOW
    );
    expect(refusal?.hasConsented).toBe(true);
    expect(refusal?.preferences.advertising).toBe(false);
    expect(hasAdvertisingConsent(record(), NOW)).toBe(true);
    expect(hasAdvertisingConsent(record({ preferences: { advertising: false } }), NOW)).toBe(false);
  });

  it('never trusts a truthy-but-not-true flag', () => {
    const c = readStoredConsent(record({ hasConsented: 'yes', preferences: { advertising: 1 } }), NOW);
    expect(c?.hasConsented).toBe(false);
    expect(c?.preferences.advertising).toBe(false);
  });
});

describe('consentExpiryMs', () => {
  it('honours a grant for a year and re-asks after a refusal within a month', () => {
    const grant = { necessary: true, analytics: false, advertising: true };
    const refusal = { necessary: true, analytics: false, advertising: false };
    expect(consentExpiryMs(grant, NOW)).toBe(NOW + CONSENT_EXPIRY_DAYS * DAY);
    expect(consentExpiryMs(refusal, NOW)).toBe(NOW + REJECT_EXPIRY_DAYS * DAY);
    expect(REJECT_EXPIRY_DAYS).toBeLessThan(CONSENT_EXPIRY_DAYS);
  });
});

/** Minimal DOM for the inline <head> loader. */
function runLoader(stored: string | null, opts: { existingTag?: boolean; now?: number } = {}) {
  const appended: Array<Record<string, string>> = [];
  const makeEl = () => {
    const attrs: Record<string, string> = {};
    const el: Record<string, unknown> = {
      setAttribute: (k: string, v: string) => { attrs[k] = v; },
      attrs,
    };
    return el;
  };
  const sandbox: Record<string, unknown> = {
    localStorage: { getItem: (k: string) => (k === CONSENT_KEY ? stored : null) },
    document: {
      querySelector: vi.fn(() => (opts.existingTag ? {} : null)),
      createElement: vi.fn(() => makeEl()),
      head: { appendChild: (el: Record<string, unknown>) => appended.push({ ...(el.attrs as Record<string, string>), src: String(el.src), async: String(el.async) }) },
    },
    Date: { now: () => opts.now ?? NOW },
    JSON,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(buildEarlyVoxLoaderScript(), sandbox);
  return { appended, window: sandbox as { _tx?: { cmds?: unknown[] } } };
}

describe('buildEarlyVoxLoaderScript — the <head> VOX loader', () => {
  it('does nothing without a stored advertising grant', () => {
    expect(runLoader(null).appended).toHaveLength(0);
    expect(runLoader(record({ preferences: { advertising: false } })).appended).toHaveLength(0);
    expect(runLoader(record({ hasConsented: false })).appended).toHaveLength(0);
    expect(runLoader(record({ version: '0.9' })).appended).toHaveLength(0);
    expect(runLoader(record({ expiryDate: NOW - 1 })).appended).toHaveLength(0);
  });

  it('starts the SDK download with the same tag AdManager looks for', () => {
    const { appended, window } = runLoader(record());
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({ src: VOX_SDK_URL, async: 'true', 'data-vox-ssp': '1', fetchpriority: 'high' });
    // The command queue the SDK drains on load is primed for AdManager's first init.
    expect(Array.isArray(window._tx?.cmds)).toBe(true);
  });

  it('never adds a second tag', () => {
    expect(runLoader(record(), { existingTag: true }).appended).toHaveLength(0);
  });

  it('survives a broken storage value', () => {
    expect(() => runLoader('{oops')).not.toThrow();
  });
});
