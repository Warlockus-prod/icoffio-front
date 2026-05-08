/**
 * info auth-guard test — gate on /api/info/** mutations.
 * Critical: a regression here = anyone can create/delete boards/feeds + burn OpenAI on watch/analyze.
 */

import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('../lib/admin-auth', () => ({
  requireAdminRole: vi.fn(),
}));

import { requireInfoAdmin } from '../lib/info/auth-guard';
import { requireAdminRole } from '../lib/admin-auth';

describe('requireInfoAdmin', () => {
  it('returns null (pass) when admin-auth allows the request', async () => {
    (requireAdminRole as any).mockResolvedValue({ ok: true, context: { email: 'a@b', role: 'editor' } });
    const req = new NextRequest('https://example.com/api/info/boards');
    const result = await requireInfoAdmin(req);
    expect(result).toBeNull();
  });

  it('returns NextResponse (deny) when admin-auth rejects', async () => {
    const denyResp = NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    (requireAdminRole as any).mockResolvedValue({ ok: false, response: denyResp });
    const req = new NextRequest('https://example.com/api/info/boards');
    const result = await requireInfoAdmin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('always asks for "editor" role minimum', async () => {
    (requireAdminRole as any).mockResolvedValue({ ok: true, context: { email: 'x', role: 'editor' } });
    const req = new NextRequest('https://example.com/api/info/x');
    await requireInfoAdmin(req);
    expect(requireAdminRole).toHaveBeenCalledWith(req, 'editor');
  });
});
