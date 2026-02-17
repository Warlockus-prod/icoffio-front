import { createClient, type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export type AssignableAdminRole = 'admin' | 'editor' | 'viewer';
export type AdminRole = 'owner' | AssignableAdminRole;

export interface AdminAuthContext {
  userId: string;
  email: string;
  role: AdminRole;
  isOwner: boolean;
}

export interface AdminRoleMember {
  email: string;
  role: AdminRole;
  is_owner: boolean;
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

const DEFAULT_OWNER_EMAILS = ['ag@voxexchange.io', 'andrzej.goleta@hybrid.ai'];
const PERSISTED_ROLES: AssignableAdminRole[] = ['admin', 'editor', 'viewer'];

const ROLE_WEIGHT: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
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

function isMissingAdminRolesTable(message: string, code?: string): boolean {
  const normalizedMessage = (message || '').toLowerCase();
  const normalizedCode = (code || '').toUpperCase();
  if (normalizedCode === '42P01') return true;

  return (
    normalizedMessage.includes('admin_user_roles') &&
    (normalizedMessage.includes('schema cache') ||
      normalizedMessage.includes('does not exist') ||
      normalizedMessage.includes('relation'))
  );
}

function toReadableRoleError(operation: string, message: string, code?: string): string {
  if (isMissingAdminRolesTable(message, code)) {
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

function getConfiguredOwnerEmails(): string[] {
  const configured = [process.env.ADMIN_OWNER_EMAILS]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  const fallback = DEFAULT_OWNER_EMAILS.map((email) => normalizeEmail(email));

  return Array.from(new Set([...(configured.length > 0 ? configured : fallback), ...fallback]));
}

export function getOwnerEmails(): string[] {
  return getConfiguredOwnerEmails();
}

export function isOwnerEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return getConfiguredOwnerEmails().includes(normalized);
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

function createOwnerMember(email: string, existing?: {
  created_at?: string;
  updated_at?: string;
  invited_by?: string | null;
}): AdminRoleMember {
  const now = new Date().toISOString();
  return {
    email: normalizeEmail(email),
    role: 'owner',
    is_owner: true,
    is_active: true,
    invited_by: existing?.invited_by || 'owner-policy',
    created_at: existing?.created_at || now,
    updated_at: existing?.updated_at || now,
  };
}

async function fetchRoleByEmail(
  email: string,
  options: { allowMissingTable?: boolean } = {}
): Promise<AdminRoleMember | null> {
  const supabase = getSupabaseAdminClient();
  const normalized = normalizeEmail(email);

  const { data, error } = await supabase
    .from('admin_user_roles')
    .select('email, role, is_active, invited_by, created_at, updated_at')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (options.allowMissingTable && isMissingAdminRolesTable(error.message, error.code)) {
      return null;
    }
    throw new Error(toReadableRoleError('Load role', error.message, error.code));
  }

  if (!data) return null;

  const role = (data.role || 'viewer') as AssignableAdminRole;
  if (!PERSISTED_ROLES.includes(role)) {
    return null;
  }

  const normalizedEmail = normalizeEmail(data.email);
  if (isOwnerEmail(normalizedEmail)) {
    return createOwnerMember(normalizedEmail, {
      created_at: data.created_at,
      updated_at: data.updated_at,
      invited_by: data.invited_by || null,
    });
  }

  return {
    email: normalizedEmail,
    role,
    is_owner: false,
    is_active: Boolean(data.is_active),
    invited_by: data.invited_by || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function upsertAdminRole(input: {
  email: string;
  role: AssignableAdminRole;
  invitedBy?: string | null;
  isActive?: boolean;
}): Promise<AdminRoleMember> {
  const normalized = normalizeEmail(input.email);

  if (isOwnerEmail(normalized)) {
    if (input.role !== 'admin' || input.isActive === false) {
      throw new Error('Owner accounts are immutable: role must stay admin and active');
    }
  }

  const supabase = getSupabaseAdminClient();
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

  const persistedRole = (data.role || 'viewer') as AssignableAdminRole;
  const member: AdminRoleMember = {
    email: normalizeEmail(data.email),
    role: persistedRole,
    is_owner: false,
    is_active: Boolean(data.is_active),
    invited_by: data.invited_by || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  if (isOwnerEmail(member.email)) {
    return createOwnerMember(member.email, {
      created_at: member.created_at,
      updated_at: member.updated_at,
      invited_by: member.invited_by,
    });
  }

  return member;
}

async function resolveRoleByEmail(
  email: string,
  options: RoleLookupOptions = {}
): Promise<AdminRoleMember | null> {
  const normalizedEmail = normalizeEmail(email);

  if (isOwnerEmail(normalizedEmail)) {
    const existingOwner = await fetchRoleByEmail(normalizedEmail, { allowMissingTable: true });
    if (existingOwner) return createOwnerMember(normalizedEmail, existingOwner);

    // Keep owner present in DB as active admin where possible.
    try {
      await upsertAdminRole({
        email: normalizedEmail,
        role: 'admin',
        invitedBy: 'owner-policy',
        isActive: true,
      });
    } catch {
      // If table missing or upsert fails, owner still remains valid at auth layer.
    }

    return createOwnerMember(normalizedEmail);
  }

  const existingRole = await fetchRoleByEmail(normalizedEmail, { allowMissingTable: true });
  if (existingRole) {
    if (!existingRole.is_active) return null;
    return existingRole;
  }

  if (!options.allowBootstrap) {
    return null;
  }

  const bootstrapEmails = Array.from(new Set([...getBootstrapEmails(), ...getConfiguredOwnerEmails()]));
  const isExplicitBootstrap = bootstrapEmails.includes(normalizedEmail);

  let canOpenBootstrap = false;
  if (!isExplicitBootstrap && process.env.ADMIN_ENABLE_OPEN_BOOTSTRAP === 'true') {
    const rowCount = await countRoleRows();
    canOpenBootstrap = rowCount === 0;
  }

  if (!isExplicitBootstrap && !canOpenBootstrap) {
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
      isOwner: roleMember.is_owner,
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
    if (error.code === '42P01') {
      const now = new Date().toISOString();
      return getConfiguredOwnerEmails().map((ownerEmail) => ({
        email: ownerEmail,
        role: 'owner',
        is_owner: true,
        is_active: true,
        invited_by: 'owner-policy',
        created_at: now,
        updated_at: now,
      }));
    }
    throw new Error(toReadableRoleError('Fetch members', error.message, error.code));
  }

  const membersMap = new Map<string, AdminRoleMember>();

  (data || []).forEach((row) => {
    const email = normalizeEmail(row.email);
    const role = (row.role || 'viewer') as AssignableAdminRole;
    if (!PERSISTED_ROLES.includes(role)) return;

    if (isOwnerEmail(email)) {
      membersMap.set(email, createOwnerMember(email, {
        created_at: row.created_at,
        updated_at: row.updated_at,
        invited_by: row.invited_by || null,
      }));
      return;
    }

    membersMap.set(email, {
      email,
      role,
      is_owner: false,
      is_active: Boolean(row.is_active),
      invited_by: row.invited_by || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  });

  const now = new Date().toISOString();
  getConfiguredOwnerEmails().forEach((ownerEmail) => {
    if (!membersMap.has(ownerEmail)) {
      membersMap.set(ownerEmail, {
        email: ownerEmail,
        role: 'owner',
        is_owner: true,
        is_active: true,
        invited_by: 'owner-policy',
        created_at: now,
        updated_at: now,
      });
    }
  });

  return Array.from(membersMap.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function ensureRoleForAuthenticatedUser(email: string): Promise<AdminRoleMember | null> {
  return resolveRoleByEmail(email, { allowBootstrap: true });
}

export async function ensureRoleForSelfSignup(
  email: string,
  defaultRole: AssignableAdminRole = 'viewer'
): Promise<AdminRoleMember> {
  const normalizedEmail = normalizeEmail(email);

  if (isOwnerEmail(normalizedEmail)) {
    return createOwnerMember(normalizedEmail);
  }

  const existing = await fetchRoleByEmail(normalizedEmail, { allowMissingTable: true });
  if (existing) {
    if (!existing.is_active) {
      throw new Error('Access for this email is disabled. Contact admin.');
    }
    return existing;
  }

  // Never grant admin by open self-signup.
  const roleToAssign: AssignableAdminRole = defaultRole === 'admin' ? 'editor' : defaultRole;

  return upsertAdminRole({
    email: normalizedEmail,
    role: roleToAssign,
    invitedBy: 'self-signup',
    isActive: true,
  });
}

export function sanitizeNextPath(input: string | null | undefined, fallback = '/en/admin'): string {
  if (!input) return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  return input;
}
