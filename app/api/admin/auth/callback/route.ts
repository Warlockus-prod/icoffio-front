import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureRoleForAuthenticatedUser,
  normalizeEmail,
  sanitizeNextPath,
  setAdminSessionCookies,
  getSupabaseAdminClient,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function isAllowedOtpType(value: string): value is EmailOtpType {
  return ALLOWED_OTP_TYPES.includes(value as EmailOtpType);
}

function withQuery(path: string, query: Record<string, string | null | undefined>): string {
  const url = new URL(path, 'https://placeholder.local');
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return `${url.pathname}${url.search}`;
}

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'), '/en/admin');
  const fallbackRedirect = (errorCode: string) =>
    NextResponse.redirect(new URL(withQuery(nextPath, { auth_error: errorCode }), request.nextUrl.origin));

  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const typeParam = request.nextUrl.searchParams.get('type') || 'magiclink';

  if (!tokenHash) {
    return fallbackRedirect('missing_token');
  }

  if (!isAllowedOtpType(typeParam)) {
    return fallbackRedirect('invalid_type');
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam,
    });

    if (error || !data.session || !data.user) {
      return fallbackRedirect('verify_failed');
    }

    const emailRaw = data.user.email || data.user.user_metadata?.email;
    const email = typeof emailRaw === 'string' ? normalizeEmail(emailRaw) : '';

    if (!email) {
      return fallbackRedirect('missing_email');
    }

    const roleMember = await ensureRoleForAuthenticatedUser(email);
    if (!roleMember || !roleMember.is_active) {
      return fallbackRedirect('not_invited');
    }

    const successPath = withQuery(nextPath, { auth: 'ok' });
    const response = NextResponse.redirect(new URL(successPath, request.nextUrl.origin));

    setAdminSessionCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });

    return response;
  } catch (error) {
    console.error('Admin auth callback error:', error);
    return fallbackRedirect('server_error');
  }
}
