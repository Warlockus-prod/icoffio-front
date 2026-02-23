/**
 * Admin Auth Route
 *
 * v10.0.0 — Simplified to password-based auth only.
 * Magic link / Supabase Auth removed.
 *
 * Actions:
 *   POST { action: 'password_login', password } — login with admin password
 *   POST { action: 'invite', email, role } — add user to admin_user_roles
 *   POST { action: 'set_role', email, role, isActive } — update role
 *   POST { action: 'logout' } — clear session
 *   GET ?action=session — check current session
 *   GET ?action=members — list admin members
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  clearAdminSessionCookies,
  getAdminMembers,
  getOwnerEmails,
  isAdminPasswordValid,
  isRoleAllowed,
  isOwnerEmail,
  normalizeEmail,
  requireAdminRole,
  setLegacyAdminSessionCookie,
  upsertAdminRole,
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

/* ---------- Handlers ---------- */

async function handlePasswordLogin(body: AuthActionRequest) {
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password.trim()) {
    return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
  }

  if (!isAdminPasswordValid(password)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }

  const ownerEmail = getOwnerEmails()[0] || 'admin@icoffio.com';
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

async function handleInvite(request: NextRequest, body: AuthActionRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  const email = validateEmail(body.email);
  if (!email) {
    return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
  }

  const role = VALID_ROLES.includes(body.role as AssignableAdminRole) ? (body.role as AssignableAdminRole) : null;
  if (!role) {
    return NextResponse.json({ success: false, error: 'Invalid role. Use admin/editor/viewer' }, { status: 400 });
  }

  if (role === 'admin' && !auth.context.isOwner) {
    return NextResponse.json({ success: false, error: 'Only owner can assign admin role' }, { status: 403 });
  }

  if (isOwnerEmail(email) && (role !== 'admin' || body.isActive === false)) {
    return NextResponse.json({ success: false, error: 'Owner account is immutable and must stay active admin' }, { status: 400 });
  }

  const member = await upsertAdminRole({
    email,
    role,
    invitedBy: auth.context.email,
    isActive: body.isActive ?? true,
  });

  return NextResponse.json({ success: true, invited: true, member });
}

async function handleSetRole(request: NextRequest, body: AuthActionRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  const email = validateEmail(body.email);
  if (!email) {
    return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
  }

  const role = VALID_ROLES.includes(body.role as AssignableAdminRole) ? (body.role as AssignableAdminRole) : null;
  if (!role) {
    return NextResponse.json({ success: false, error: 'Invalid role. Use admin/editor/viewer' }, { status: 400 });
  }

  if (role === 'admin' && !auth.context.isOwner) {
    return NextResponse.json({ success: false, error: 'Only owner can assign admin role' }, { status: 403 });
  }

  if (isOwnerEmail(email)) {
    return NextResponse.json({ success: false, error: 'Owner account cannot be modified' }, { status: 403 });
  }

  if (auth.context.email === email && !isRoleAllowed(role, 'admin')) {
    return NextResponse.json({ success: false, error: 'You cannot downgrade your own account from admin' }, { status: 400 });
  }

  if (auth.context.email === email && body.isActive === false) {
    return NextResponse.json({ success: false, error: 'You cannot disable your own account' }, { status: 400 });
  }

  const member = await upsertAdminRole({
    email,
    role,
    invitedBy: auth.context.email,
    isActive: body.isActive ?? true,
  });

  return NextResponse.json({ success: true, member });
}

async function handleLogout() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookies(response);
  return response;
}

/* ---------- Routes ---------- */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AuthActionRequest;
    const action = body.action || 'session';

    if (action === 'request_magic_link') {
      // Magic link auth removed — use password login instead.
      return NextResponse.json(
        { success: false, error: 'Magic link auth is no longer available. Use password login.' },
        { status: 410 }
      );
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

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Admin auth POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'session';

  try {
    if (action === 'members') {
      const auth = await requireAdminRole(request, 'admin');
      if (!auth.ok) return auth.response;

      const members = await getAdminMembers();
      return NextResponse.json({ success: true, members });
    }

    const auth = await requireAdminRole(request, 'viewer');
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

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        email: auth.context.email,
        role: auth.context.role,
        isOwner: auth.context.isOwner,
      },
    });
  } catch (error) {
    console.error('Admin auth GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
