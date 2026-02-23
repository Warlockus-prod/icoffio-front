/**
 * Admin Auth Callback
 *
 * Previously handled Supabase Auth magic link OTP verification.
 * Now redirects to admin panel since auth is password-based.
 *
 * @version 10.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeNextPath } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'), '/en/admin');
  // Magic link auth removed — redirect to admin login page.
  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
