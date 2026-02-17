import { NextRequest, NextResponse } from 'next/server';
import { buildSiteUrl } from '@/lib/site-url';
import {
  clearAdminSessionCookies,
  ensureRoleForSelfSignup,
  getAdminMembers,
  getOwnerEmails,
  getSupabaseAdminClient,
  isAdminPasswordValid,
  isRoleAllowed,
  isOwnerEmail,
  normalizeEmail,
  requireAdminRole,
  sanitizeNextPath,
  setLegacyAdminSessionCookie,
  setAdminSessionCookies,
  upsertAdminRole,
  ensureRoleForAuthenticatedUser,
  type AssignableAdminRole,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AuthActionRequest {
  action?: string;
  email?: string;
  password?: string;
  role?: AssignableAdminRole;
  locale?: 'en' | 'pl';
  next?: string;
  isActive?: boolean;
}

const VALID_ROLES: AssignableAdminRole[] = ['admin', 'editor', 'viewer'];

function validateEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const normalized = normalizeEmail(input);
  if (!normalized) return null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) return null;
  return normalized;
}

function resolveNextPath(locale?: string, providedNext?: string): string {
  const localeSafe = locale === 'pl' ? 'pl' : 'en';
  return sanitizeNextPath(providedNext, `/${localeSafe}/admin`);
}

function buildCallbackRedirect(nextPath: string): string {
  const encodedNext = encodeURIComponent(nextPath);
  return buildSiteUrl(`/api/admin/auth/callback?next=${encodedNext}`);
}

function isSelfSignupEnabled(): boolean {
  return process.env.ADMIN_SELF_SIGNUP_ENABLED === 'true';
}

function resolveSelfSignupRole(): AssignableAdminRole {
  const configured = (process.env.ADMIN_SELF_SIGNUP_DEFAULT_ROLE || '').trim().toLowerCase();
  if (configured === 'editor') return 'editor';
  if (configured === 'viewer') return 'viewer';
  if (configured === 'admin') return 'editor';
  return 'viewer';
}

async function sendMagicLinkEmail(input: {
  email: string;
  redirectTo: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: input.redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function handleRequestMagicLink(body: AuthActionRequest) {
  const email = validateEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Valid email is required' },
      { status: 400 }
    );
  }

  const requestedSelfSignupRole = resolveSelfSignupRole();
  let pendingSelfSignupFinalization = false;
  let role = await ensureRoleForAuthenticatedUser(email);
  if (!role || !role.is_active) {
    if (!isSelfSignupEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is not invited to admin panel',
        },
        { status: 403 }
      );
    }

    try {
      role = await ensureRoleForSelfSignup(email, requestedSelfSignupRole);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Self-signup failed';
      const missingRolesTable = message.includes('admin_user_roles');

      if (!missingRolesTable) {
        throw error;
      }

      pendingSelfSignupFinalization = true;
      const now = new Date().toISOString();
      role = {
        email,
        role: requestedSelfSignupRole,
        is_owner: false,
        is_active: true,
        invited_by: 'self-signup-pending',
        created_at: now,
        updated_at: now,
      };
    }
  }

  const nextPath = resolveNextPath(body.locale, body.next);
  const redirectTo = buildCallbackRedirect(nextPath);

  const sent = await sendMagicLinkEmail({ email, redirectTo });
  if (!sent.success) {
    return NextResponse.json(
      { success: false, error: sent.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: pendingSelfSignupFinalization
      ? 'Magic link sent. Role will be finalized on first login.'
      : role?.invited_by === 'self-signup'
        ? 'Account created. Magic link sent.'
        : 'Magic link sent',
    email,
    role: role.role,
  });
}

async function handleInvite(request: NextRequest, body: AuthActionRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: true, allowBootstrap: true });
  if (!auth.ok) return auth.response;

  const email = validateEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Valid email is required' },
      { status: 400 }
    );
  }

  const role = VALID_ROLES.includes(body.role as AssignableAdminRole) ? (body.role as AssignableAdminRole) : null;
  if (!role) {
    return NextResponse.json(
      { success: false, error: 'Invalid role. Use admin/editor/viewer' },
      { status: 400 }
    );
  }

  if (role === 'admin' && !auth.context.isOwner) {
    return NextResponse.json(
      { success: false, error: 'Only owner can assign admin role' },
      { status: 403 }
    );
  }

  if (isOwnerEmail(email) && (role !== 'admin' || body.isActive === false)) {
    return NextResponse.json(
      { success: false, error: 'Owner account is immutable and must stay active admin' },
      { status: 400 }
    );
  }

  const nextPath = resolveNextPath(body.locale, body.next);
  const redirectTo = buildCallbackRedirect(nextPath);

  const member = await upsertAdminRole({
    email,
    role,
    invitedBy: auth.context.email,
    isActive: body.isActive ?? true,
  });

  const supabase = getSupabaseAdminClient();
  const inviteResponse = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (inviteResponse.error) {
    const message = inviteResponse.error.message || 'Invite failed';
    const lower = message.toLowerCase();

    // Existing users may not be invite-able via admin endpoint, fallback to direct magic link.
    if (lower.includes('already') || lower.includes('registered')) {
      const sent = await sendMagicLinkEmail({ email, redirectTo });
      if (!sent.success) {
        return NextResponse.json(
          { success: false, error: sent.error },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  }

  const response = NextResponse.json({
    success: true,
    invited: true,
    member,
  });

  if (auth.refreshedSession) {
    setAdminSessionCookies(response, auth.refreshedSession);
  }

  return response;
}

async function handleSetRole(request: NextRequest, body: AuthActionRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: true, allowBootstrap: true });
  if (!auth.ok) return auth.response;

  const email = validateEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Valid email is required' },
      { status: 400 }
    );
  }

  const role = VALID_ROLES.includes(body.role as AssignableAdminRole) ? (body.role as AssignableAdminRole) : null;
  if (!role) {
    return NextResponse.json(
      { success: false, error: 'Invalid role. Use admin/editor/viewer' },
      { status: 400 }
    );
  }

  if (role === 'admin' && !auth.context.isOwner) {
    return NextResponse.json(
      { success: false, error: 'Only owner can assign admin role' },
      { status: 403 }
    );
  }

  if (isOwnerEmail(email)) {
    return NextResponse.json(
      { success: false, error: 'Owner account cannot be modified' },
      { status: 403 }
    );
  }

  if (auth.context.email === email && !isRoleAllowed(role, 'admin')) {
    return NextResponse.json(
      { success: false, error: 'You cannot downgrade your own account from admin' },
      { status: 400 }
    );
  }

  if (auth.context.email === email && body.isActive === false) {
    return NextResponse.json(
      { success: false, error: 'You cannot disable your own account' },
      { status: 400 }
    );
  }

  const member = await upsertAdminRole({
    email,
    role,
    invitedBy: auth.context.email,
    isActive: body.isActive ?? true,
  });

  const response = NextResponse.json({ success: true, member });
  if (auth.refreshedSession) {
    setAdminSessionCookies(response, auth.refreshedSession);
  }

  return response;
}

async function handlePasswordLogin(body: AuthActionRequest) {
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password.trim()) {
    return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
  }

  if (!isAdminPasswordValid(password)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }

  const ownerEmail = getOwnerEmails()[0] || 'ag@voxexchange.io';
  const response = NextResponse.json({
    success: true,
    message: 'Signed in successfully',
    user: {
      email: ownerEmail,
      role: 'owner',
      isOwner: true,
    },
  });

  setLegacyAdminSessionCookie(response, ownerEmail);
  return response;
}

async function handleLogout() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookies(response);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AuthActionRequest;
    const action = body.action || 'session';

    if (action === 'request_magic_link') {
      return await handleRequestMagicLink(body);
    }

    if (action === 'password_login') {
      return await handlePasswordLogin(body);
    }

    if (action === 'invite') {
      return await handleInvite(request, body);
    }

    if (action === 'set_role') {
      return await handleSetRole(request, body);
    }

    if (action === 'logout') {
      return await handleLogout();
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin auth POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isRolesMigrationMissing = message.includes('table admin_user_roles is missing');
    return NextResponse.json(
      {
        success: false,
        error: message,
        hint: isRolesMigrationMissing
          ? 'Run Supabase migration 20260217_admin_roles_and_access.sql before inviting/self-signup users.'
          : undefined,
      },
      { status: isRolesMigrationMissing ? 503 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'session';

  try {
    if (action === 'members') {
      const auth = await requireAdminRole(request, 'admin', { allowRefresh: true, allowBootstrap: true });
      if (!auth.ok) return auth.response;

      const members = await getAdminMembers();
      const response = NextResponse.json({ success: true, members });

      if (auth.refreshedSession) {
        setAdminSessionCookies(response, auth.refreshedSession);
      }

      return response;
    }

    const auth = await requireAdminRole(request, 'viewer', { allowRefresh: true, allowBootstrap: true });
    if (!auth.ok) {
      const status = auth.response.status;
      if (status === 401 || status === 403) {
        return NextResponse.json({
          success: true,
          authenticated: false,
          user: null,
        });
      }
      return auth.response;
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        email: auth.context.email,
        role: auth.context.role,
        isOwner: auth.context.isOwner,
      },
    });

    if (auth.refreshedSession) {
      setAdminSessionCookies(response, auth.refreshedSession);
    }

    return response;
  } catch (error) {
    console.error('Admin auth GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
