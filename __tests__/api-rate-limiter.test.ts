/**
 * Rate limiter tests — brute-force protection on /api/admin/auth depends on this.
 * Critical: a regression here = unlimited password guesses possible.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  API_RATE_LIMITS,
  checkRateLimit,
  createRateLimitResponse,
  cleanupRateLimitStore,
} from '../lib/api-rate-limiter';

function makeRequest(ip: string, path = '/test'): NextRequest {
  return new NextRequest(`https://example.com${path}`, {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Reset in-memory store between tests by aging out everything we touched
    cleanupRateLimitStore();
  });

  it('allows up to maxRequests then blocks the next', () => {
    const cfg = API_RATE_LIMITS.AUTH; // 5 / 15 min
    const ip = '203.0.113.10'; // TEST-NET-3 unused IP

    for (let i = 1; i <= cfg.maxRequests; i++) {
      const r = checkRateLimit(makeRequest(ip), 'AUTH');
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(cfg.maxRequests - i);
    }

    const blocked = checkRateLimit(makeRequest(ip), 'AUTH');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(typeof blocked.retryAfter).toBe('number');
    expect(blocked.retryAfter!).toBeGreaterThan(0);
  });

  it('different IPs have independent buckets', () => {
    const ipA = '203.0.113.20';
    const ipB = '203.0.113.21';
    // Burn IP A's budget
    for (let i = 0; i < API_RATE_LIMITS.AUTH.maxRequests; i++) {
      checkRateLimit(makeRequest(ipA), 'AUTH');
    }
    expect(checkRateLimit(makeRequest(ipA), 'AUTH').allowed).toBe(false);
    // IP B still fresh
    expect(checkRateLimit(makeRequest(ipB), 'AUTH').allowed).toBe(true);
  });

  it('different limit-types have independent buckets for same IP', () => {
    const ip = '203.0.113.30';
    // Burn AUTH bucket
    for (let i = 0; i < API_RATE_LIMITS.AUTH.maxRequests; i++) {
      checkRateLimit(makeRequest(ip), 'AUTH');
    }
    expect(checkRateLimit(makeRequest(ip), 'AUTH').allowed).toBe(false);
    // PUBLIC_API bucket on same IP must still allow
    expect(checkRateLimit(makeRequest(ip), 'PUBLIC_API').allowed).toBe(true);
  });

  it('falls back to anonymous when no IP header', () => {
    const req = new NextRequest('https://example.com/test'); // no x-forwarded-for
    const r = checkRateLimit(req, 'PUBLIC_API');
    // Should not throw; result must be a valid object
    expect(typeof r.allowed).toBe('boolean');
    expect(typeof r.remaining).toBe('number');
  });

  it('respects customKey override (per-user vs per-ip)', () => {
    const ip = '203.0.113.40';
    // Burn user-specific bucket
    for (let i = 0; i < API_RATE_LIMITS.AUTH.maxRequests; i++) {
      checkRateLimit(makeRequest(ip), 'AUTH', 'user:alice');
    }
    expect(checkRateLimit(makeRequest(ip), 'AUTH', 'user:alice').allowed).toBe(false);
    // Different user from same IP — fresh bucket
    expect(checkRateLimit(makeRequest(ip), 'AUTH', 'user:bob').allowed).toBe(true);
  });

  it('uses cf-connecting-ip / x-real-ip / x-forwarded-for in priority order', () => {
    // CF priority highest
    const cfReq = new NextRequest('https://example.com/test', {
      headers: {
        'cf-connecting-ip': '198.51.100.1',
        'x-forwarded-for': '198.51.100.99',
        'x-real-ip': '198.51.100.50',
      },
    });
    // Burn 198.51.100.1's AUTH bucket
    for (let i = 0; i < API_RATE_LIMITS.AUTH.maxRequests; i++) {
      checkRateLimit(cfReq, 'AUTH');
    }
    // Same CF IP should be blocked
    expect(checkRateLimit(cfReq, 'AUTH').allowed).toBe(false);
    // x-forwarded-for-only request with the SAME IP must also be blocked (proves CF identifier was used)
    const xffReq = new NextRequest('https://example.com/test', {
      headers: { 'x-forwarded-for': '198.51.100.1' },
    });
    expect(checkRateLimit(xffReq, 'AUTH').allowed).toBe(false);
  });
});

describe('createRateLimitResponse', () => {
  it('returns 429 with Retry-After header', async () => {
    const resp = createRateLimitResponse('AUTH', { remaining: 0, resetAt: Date.now() + 60000, retryAfter: 60 });
    expect(resp.status).toBe(429);
    expect(resp.headers.get('Retry-After')).toBe('60');
    expect(resp.headers.get('X-RateLimit-Limit')).toBe(String(API_RATE_LIMITS.AUTH.maxRequests));
    const body = await resp.json();
    expect(body.success).toBe(false);
    expect(body.retryAfter).toBe(60);
  });
});
