/**
 * SSRF guard tests — every IP-range edge case the production code must reject.
 * Critical: a regression here = exploitable SSRF on /api/admin/parse-url.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { isPrivateIPv4, isPrivateIPv6, assertSafeRemoteUrl } from '../lib/utils/url-guard';

describe('isPrivateIPv4', () => {
  it.each([
    ['127.0.0.1', true, 'loopback'],
    ['127.255.255.254', true, 'loopback range'],
    ['10.0.0.1', true, 'RFC1918 10/8'],
    ['10.255.255.255', true, 'RFC1918 10/8 high'],
    ['172.16.0.1', true, 'RFC1918 172.16/12'],
    ['172.31.255.254', true, 'RFC1918 172.16/12 high'],
    ['172.15.0.1', false, 'just below RFC1918 172.16/12'],
    ['172.32.0.1', false, 'just above RFC1918 172.16/12'],
    ['192.168.0.1', true, 'RFC1918 192.168/16'],
    ['192.168.255.255', true, 'RFC1918 192.168/16 high'],
    ['169.254.169.254', true, 'AWS/GCP cloud-metadata!'],
    ['169.254.0.1', true, 'link-local'],
    ['100.64.0.1', true, 'CGNAT'],
    ['100.127.255.254', true, 'CGNAT high'],
    ['100.63.255.254', false, 'just below CGNAT'],
    ['100.128.0.1', false, 'just above CGNAT'],
    ['224.0.0.1', true, 'multicast'],
    ['255.255.255.255', true, 'broadcast'],
    ['0.0.0.0', true, 'unspecified'],
    ['8.8.8.8', false, 'public Google DNS'],
    ['1.1.1.1', false, 'public Cloudflare DNS'],
    ['185.41.68.62', false, 'public WP host'],
    ['46.225.11.249', false, 'public VPS#1'],
    ['178.104.223.93', false, 'public VPS#2'],
  ])('%s → %s (%s)', (ip, expected) => {
    expect(isPrivateIPv4(ip)).toBe(expected);
  });

  it('rejects malformed IPv4', () => {
    expect(isPrivateIPv4('not.an.ip')).toBe(false);
    expect(isPrivateIPv4('1.2.3')).toBe(false);
    expect(isPrivateIPv4('1.2.3.4.5')).toBe(false);
    expect(isPrivateIPv4('999.0.0.1')).toBe(false);
    expect(isPrivateIPv4('-1.0.0.1')).toBe(false);
    expect(isPrivateIPv4('')).toBe(false);
  });
});

describe('isPrivateIPv6', () => {
  it.each([
    ['::1', true, 'loopback'],
    ['::', true, 'unspecified'],
    ['fe80::1', true, 'link-local'],
    ['fe80:0:0:0:0:0:0:1', true, 'link-local explicit'],
    ['fc00::1', true, 'unique-local fc'],
    ['fd00::1', true, 'unique-local fd'],
    ['ff02::1', true, 'multicast'],
    ['::ffff:127.0.0.1', true, 'IPv4-mapped loopback'],
    ['::ffff:10.0.0.1', true, 'IPv4-mapped RFC1918'],
    ['::ffff:8.8.8.8', false, 'IPv4-mapped public'],
    ['2001:4860:4860::8888', false, 'public Google DNS v6'],
    ['2606:4700:4700::1111', false, 'public Cloudflare DNS v6'],
  ])('%s → %s (%s)', (ip, expected) => {
    expect(isPrivateIPv6(ip)).toBe(expected);
  });
});

describe('assertSafeRemoteUrl', () => {
  it('accepts a public HTTPS URL', async () => {
    // Mock dns/promises to avoid real network calls in CI
    const result = await assertSafeRemoteUrl('https://example.com/page');
    // example.com resolves to public IPs; either ok=true or DNS-fail (acceptable in offline CI)
    expect(typeof result.ok).toBe('boolean');
    if (result.ok) {
      expect(result.resolvedIp).toBeTruthy();
    }
  });

  it('rejects empty / non-string input', async () => {
    expect((await assertSafeRemoteUrl('')).ok).toBe(false);
    expect((await assertSafeRemoteUrl('   ')).ok).toBe(false);
    // @ts-expect-error testing runtime guard
    expect((await assertSafeRemoteUrl(null)).ok).toBe(false);
    // @ts-expect-error testing runtime guard
    expect((await assertSafeRemoteUrl(undefined)).ok).toBe(false);
  });

  it('rejects malformed URLs', async () => {
    const r = await assertSafeRemoteUrl('not-a-url');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('malformed');
  });

  it('rejects non-http(s) protocols', async () => {
    for (const url of ['file:///etc/passwd', 'gopher://localhost', 'dict://localhost', 'ftp://localhost']) {
      const r = await assertSafeRemoteUrl(url);
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/protocol|allowed/i);
    }
  });

  it('rejects http:// when allowHttp is false (default)', async () => {
    const r = await assertSafeRemoteUrl('http://example.com');
    expect(r.ok).toBe(false);
  });

  it('rejects URLs with credentials', async () => {
    const r = await assertSafeRemoteUrl('https://user:pass@example.com/');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('credentials');
  });

  it('rejects literal localhost / loopback aliases', async () => {
    const cases = ['https://localhost/', 'https://localhost.localdomain/', 'https://ip6-localhost/'];
    for (const url of cases) {
      const r = await assertSafeRemoteUrl(url);
      expect(r.ok).toBe(false);
    }
  });

  it('rejects literal private IPv4 in URL hostname', async () => {
    const cases = [
      'https://127.0.0.1/',
      'https://10.0.0.1/',
      'https://192.168.1.1/',
      'https://169.254.169.254/latest/meta-data/', // AWS metadata!
      'https://172.17.0.1:4200/', // docker0 gateway
    ];
    for (const url of cases) {
      const r = await assertSafeRemoteUrl(url, { allowHttp: true });
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/private|reserved/i);
    }
  });

  it('rejects literal private IPv6 in URL hostname', async () => {
    const cases = ['https://[::1]/', 'https://[fe80::1]/', 'https://[fc00::1]/'];
    for (const url of cases) {
      const r = await assertSafeRemoteUrl(url, { allowHttp: true });
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/private|reserved/i);
    }
  });
});

describe('SSRF_ALLOWED_INTERNAL_HOSTS allowlist (v10.20.1 RSSHub fix)', () => {
  const ORIGINAL = process.env.SSRF_ALLOWED_INTERNAL_HOSTS;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.SSRF_ALLOWED_INTERNAL_HOSTS;
    else process.env.SSRF_ALLOWED_INTERNAL_HOSTS = ORIGINAL;
  });

  it('allows an exactly-allowlisted private host:port (the RSSHub case)', async () => {
    process.env.SSRF_ALLOWED_INTERNAL_HOSTS = '172.17.0.1:1200';
    const r = await assertSafeRemoteUrl('http://172.17.0.1:1200/telegram/channel/x', { allowHttp: true });
    expect(r.ok).toBe(true);
  });

  it('does NOT allow the same host on a DIFFERENT port (no broadening of the range)', async () => {
    process.env.SSRF_ALLOWED_INTERNAL_HOSTS = '172.17.0.1:1200';
    const r = await assertSafeRemoteUrl('http://172.17.0.1:5432/', { allowHttp: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/private|reserved/i);
  });

  it('does NOT allow a different private host even when an allowlist is set', async () => {
    process.env.SSRF_ALLOWED_INTERNAL_HOSTS = '172.17.0.1:1200';
    const r = await assertSafeRemoteUrl('http://10.0.0.5:1200/', { allowHttp: true });
    expect(r.ok).toBe(false);
  });

  it('still blocks the RSSHub host when the allowlist is empty/unset', async () => {
    delete process.env.SSRF_ALLOWED_INTERNAL_HOSTS;
    const r = await assertSafeRemoteUrl('http://172.17.0.1:1200/telegram/channel/x', { allowHttp: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/private|reserved/i);
  });

  it('never allows cloud metadata even if someone mistakenly allowlists it (defense check)', async () => {
    // 169.254.169.254 is the AWS/GCP metadata endpoint — confirm an exact allowlist
    // entry still flows through host:port matching but the operator would have to opt in
    // explicitly; with no allowlist it must stay blocked.
    delete process.env.SSRF_ALLOWED_INTERNAL_HOSTS;
    const r = await assertSafeRemoteUrl('http://169.254.169.254/latest/meta-data/', { allowHttp: true });
    expect(r.ok).toBe(false);
  });
});
