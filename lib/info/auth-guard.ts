/**
 * Auth guard for /api/info/** mutating endpoints.
 *
 * BEFORE v10.6.1, all info-portal/Market-Watch routes were public — so anyone
 * could create/delete boards/feeds and burn OpenAI credits via watch/analyze etc.
 *
 * Usage in each write handler (POST/PUT/DELETE/admin GET):
 *
 *   import { requireInfoAdmin } from '@/lib/info/auth-guard';
 *   ...
 *   const denied = await requireInfoAdmin(request);
 *   if (denied) return denied;
 *
 * Returns NextResponse with 401/403 when caller is not editor+; null = pass.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';

export async function requireInfoAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const auth = await requireAdminRole(request, 'editor');
  if (!auth.ok) return auth.response;
  return null;
}
