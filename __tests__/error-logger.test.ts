/**
 * Error logger tests — must NEVER throw, must always console-fall-back if DB fails.
 * Critical: a regression here = error logging itself breaks request handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock pg-pool BEFORE importing error-logger so the import picks up the mock.
vi.mock('../lib/pg-pool', () => ({
  getPool: () => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }),
}));

import { logError, logInfo, logWarn, logCritical } from '../lib/error-logger';

describe('error-logger — must never throw', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('logError with minimal options — does not throw', async () => {
    await expect(
      logError({ source: 'test', message: 'hello' }),
    ).resolves.toBeUndefined();
  });

  it('logError with Error instance — captures stack', async () => {
    const err = new Error('boom');
    await expect(
      logError({ source: 'test', message: 'crash', error: err }),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('logError with non-Error error — coerces to string safely', async () => {
    await expect(logError({ source: 'test', message: 'x', error: 42 })).resolves.toBeUndefined();
    await expect(logError({ source: 'test', message: 'x', error: { foo: 'bar' } })).resolves.toBeUndefined();
    await expect(logError({ source: 'test', message: 'x', error: null })).resolves.toBeUndefined();
    await expect(logError({ source: 'test', message: 'x', error: undefined })).resolves.toBeUndefined();
  });

  it('respects level — info goes to console.info, warn to console.warn, error to console.error', async () => {
    await logInfo({ source: 't', message: 'i' });
    expect(console.info).toHaveBeenCalled();
    await logWarn({ source: 't', message: 'w' });
    expect(console.warn).toHaveBeenCalled();
    await logError({ source: 't', message: 'e' });
    expect(console.error).toHaveBeenCalled();
  });

  it('logCritical = level "critical"', async () => {
    await expect(logCritical({ source: 't', message: 'c' })).resolves.toBeUndefined();
  });

  it('truncates very long messages / stacks / metadata to safe sizes', async () => {
    const veryLongMessage = 'x'.repeat(20000);
    const veryLongStack = 'y'.repeat(50000);
    const err = new Error('boom');
    err.stack = veryLongStack;
    await expect(
      logError({
        source: 'a'.repeat(500), // > 100 char
        message: veryLongMessage,
        error: err,
        metadata: { huge: veryLongStack },
        requestPath: 'p'.repeat(2000),
        userEmail: 'a'.repeat(500) + '@example.com',
      }),
    ).resolves.toBeUndefined();
  });

  it('handles all-options call without surprises', async () => {
    await expect(
      logError({
        level: 'error',
        source: 'admin-auth',
        message: 'failed login',
        error: new Error('bad creds'),
        metadata: { ip: '1.2.3.4', attempts: 5 },
        requestPath: '/api/admin/auth',
        requestMethod: 'POST',
        userEmail: 'user@example.com',
        userIp: '1.2.3.4',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('error-logger — DB failure resilience', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
  });

  it('still resolves when DB throws', async () => {
    vi.doMock('../lib/pg-pool', () => ({
      getPool: () => ({ query: vi.fn().mockRejectedValue(new Error('connection refused')) }),
    }));
    const mod = await import('../lib/error-logger');
    await expect(mod.logError({ source: 't', message: 'm' })).resolves.toBeUndefined();
  });

  it('still resolves when getPool itself throws', async () => {
    vi.doMock('../lib/pg-pool', () => ({
      getPool: () => { throw new Error('pool init failed'); },
    }));
    const mod = await import('../lib/error-logger');
    await expect(mod.logError({ source: 't', message: 'm' })).resolves.toBeUndefined();
  });
});
