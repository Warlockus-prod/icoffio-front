import { createClient, type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export type AdminRole = 'admin' | 'editor' | 'viewer';

export interface AdminAuthContext {
  userId: string;
  email: string;
  role: AdminRole;
}

export interface AdminRoleMember {
  email: string;
  role: AdminRole;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RoleLookupOptions {
  allowBootstrap?: boolean;
}

export interface RequireRoleOptions {
  allowRefresh?: boolean;
  allowBootstrap?: boolean;
}

export interface RequireRoleSuccess {
  ok: true;
  context: AdminAuthContext;
  refreshedSession?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RequireRoleFailure {
  ok: false;
  response: NextResponse;
}

export type RequireRoleResult = RequireRoleSuccess | RequireRoleFailure;

const ROLE_WEIGHT: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export const ADMIN_ACCESS_COOKIE = 'icoffio_admin_access_token';
export const ADMIN_REFRESH_COOKIE = 'icoffio_admin_refresh_token';

const ADMIN_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function getSupabaseCredentials(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured');
  }

  return { url, key };
}

function toReadableRoleError(operation: string, message: string, code?: string): string {
  if (code === '42P01') {
    return `${operation} failed: table admin_user_roles is missing. Run Supabase migration 20260217_admin_roles_and_access.sql`;
  }
  return `${operation} failed: ${message}`;
}

export function getSupabaseAdminClient() {
  const { url, key } = getSupabaseCredentials();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isRoleAllowed(currentRole: AdminRole, requiredRole: AdminRole): boolean {
  return ROLE_WEIGHT[currentRole] >= ROLE_WEIGHT[requiredRole];
}

function getAuthTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (bearer) return bearer;

  const cookieToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  return cookieToken || null;
}

function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_REFRESH_COOKIE)?.value || null;
}

function getBootstrapEmails(): string[] {
  const raw = [
    process.env.ADMIN_BOOTSTRAP_EMAILS,
    process.env.ADMIN_BOOTSTRAP_EMAIL,
    process.env.ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .join(',');

  return raw
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

async function countRoleRows(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from('admin_user_roles')
    .select('email', { count: 'exact', head: true });

  if (error) {
    throw new Error(toReadableRoleError('Count roles', error.message, error.code));
  }

  return count || 0;
}

async function fetchRoleByEmail(email: string): Promise<AdminRoleMember | null> {
  const supabase = getSupabaseAdminClient();
  const normalized = normalizeEmail(email);

  const { data, error } = await supabase
    .from('admin_user_roles')
    .select('email, role, is_active, invited_by, created_at, updated_at')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toReadableRoleError('Load role', error.message, error.code));
  }

  if (!data) return null;

  const role = (data.role || 'viewer') as AdminRole;
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return null;
  }

  return {
    email: normalizeEmail(data.email),
    role,
    is_active: Boolean(data.is_active),
    invited_by: data.invited_by || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function upsertAdminRole(input: {
  email: string;
  role: AdminRole;
  invitedBy?: string | null;
  isActive?: boolean;
}): Promise<AdminRoleMember> {
  const supabase = getSupabaseAdminClient();
  const normalized = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const payload = {
    email: normalized,
    role: input.role,
    is_active: input.isActive ?? true,
    invited_by: input.invitedBy || null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('admin_user_roles')
    .upsert(payload, { onConflict: 'email' })
    .select('email, role, is_active, invited_by, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(toReadableRoleError('Upsert role', error.message, error.code));
  }

  return {
    email: normalizeEmail(data.email),
    role: data.role as AdminRole,
    is_active: Boolean(data.is_active),
    invited_by: data.invited_by || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

async function resolveRoleByEmail(
  email: string,
  options: RoleLookupOptions = {}
): Promise<AdminRoleMember | null> {
  const existingRole = await fetchRoleByEmail(email);
  if (existingRole) {
    if (!existingRole.is_active) return null;
    return existingRole;
  }

  if (!options.allowBootstrap) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const bootstrapEmails = getBootstrapEmails();
  const rowCount = await countRoleRows();

  // Bootstrap strategy:
  // 1) if explicit bootstrap allow-list configured -> only those emails
  // 2) if table is empty and no allow-list -> first authenticated user becomes admin
  const canBootstrap = bootstrapEmails.length > 0
    ? bootstrapEmails.includes(normalizedEmail)
    : rowCount === 0;

  if (!canBootstrap) {
    return null;
  }

  return upsertAdminRole({
    email: normalizedEmail,
    role: 'admin',
    invitedBy: 'bootstrap',
    isActive: true,
  });
}

export function setAdminSessionCookies(
  response: NextResponse,
  session: { accessToken: string; refreshToken: string }
) {
  response.cookies.set(ADMIN_ACCESS_COOKIE, session.accessToken, {
    ...ADMIN_COOKIE_BASE_OPTIONS,
    maxAge: 60 * 60 * 8, // 8h
  });

  response.cookies.set(ADMIN_REFRESH_COOKIE, session.refreshToken, {
    ...ADMIN_COOKIE_BASE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30, // 30d
  });
}

export function clearAdminSessionCookies(response: NextResponse) {
  response.cookies.set(ADMIN_ACCESS_COOKIE, '', {
    ...ADMIN_COOKIE_BASE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(ADMIN_REFRESH_COOKIE, '', {
    ...ADMIN_COOKIE_BASE_OPTIONS,
    maxAge: 0,
  });
}

async function getUserFromToken(token: string): Promise<User | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function tryRefreshSession(refreshToken: string): Promise<{
  user: User | null;
  accessToken: string;
  refreshToken: string;
} | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    return null;
  }

  return {
    user: data.user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

function extractUserEmail(user: User): string | null {
  if (user.email) {
    return normalizeEmail(user.email);
  }

  const raw = user.user_metadata?.email;
  if (typeof raw === 'string' && raw.trim()) {
    return normalizeEmail(raw);
  }

  return null;
}

export async function requireAdminRole(
  request: NextRequest,
  requiredRole: AdminRole,
  options: RequireRoleOptions = {}
): Promise<RequireRoleResult> {
  const accessToken = getAuthTokenFromRequest(request);

  let user: User | null = null;
  let refreshedSession: { accessToken: string; refreshToken: string } | undefined;

  if (accessToken) {
    user = await getUserFromToken(accessToken);
  }

  if (!user && options.allowRefresh !== false) {
    const refreshToken = getRefreshTokenFromRequest(request);
    if (refreshToken) {
      const refreshed = await tryRefreshSession(refreshToken);
      if (refreshed?.user) {
        user = refreshed.user;
        refreshedSession = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        };
      }
    }
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const email = extractUserEmail(user);
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'User email is missing' }, { status: 403 }),
    };
  }

  let roleMember: AdminRoleMember | null = null;
  try {
    roleMember = await resolveRoleByEmail(email, {
      allowBootstrap: options.allowBootstrap ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve role';
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: message }, { status: 500 }),
    };
  }

  if (!roleMember) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 }),
    };
  }

  if (!isRoleAllowed(roleMember.role, requiredRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: `Forbidden. Required role: ${requiredRole}`,
          role: roleMember.role,
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    context: {
      userId: user.id,
      email,
      role: roleMember.role,
    },
    refreshedSession,
  };
}

export async function getAdminMembers(): Promise<AdminRoleMember[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('admin_user_roles')
    .select('email, role, is_active, invited_by, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(toReadableRoleError('Fetch members', error.message, error.code));
  }

  return (data || []).map((row) => ({
    email: normalizeEmail(row.email),
    role: row.role as AdminRole,
    is_active: Boolean(row.is_active),
    invited_by: row.invited_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function ensureRoleForAuthenticatedUser(email: string): Promise<AdminRoleMember | null> {
  return resolveRoleByEmail(email, { allowBootstrap: true });
}

export function sanitizeNextPath(input: string | null | undefined, fallback = '/en/admin'): string {
  if (!input) return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  return input;
}
