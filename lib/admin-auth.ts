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

const DEFAULT_OWNER_EMAILS = (process.env.ADMIN_OWNER_EMAILS || 'ag@voxexchange.io,andrzej.goleta@hybrid.ai')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);
const PERSISTED_ROLES: AssignableAdminRole[] = ['admin', 'editor', 'viewer'];

const ROLE_WEIGHT: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

const ADMIN_ROLE_META_KEY = 'icoffio_admin_role';
const ADMIN_ACTIVE_META_KEY = 'icoffio_admin_active';
const ADMIN_INVITED_BY_META_KEY = 'icoffio_admin_invited_by';
const ADMIN_UPDATED_AT_META_KEY = 'icoffio_admin_updated_at';

export const ADMIN_ACCESS_COOKIE = 'icoffio_admin_access_token';
export const ADMIN_REFRESH_COOKIE = 'icoffio_admin_refresh_token';
export const ADMIN_LEGACY_SESSION_COOKIE = 'icoffio_admin_legacy_session';
const LEGACY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

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

function safeStringEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function getConfiguredAdminPassword(): string | null {
  // SECURITY: Only use server-side ADMIN_PASSWORD. NEXT_PUBLIC_ prefix would leak to browser.
  const configured = (process.env.ADMIN_PASSWORD || '').trim();
  return configured || null;
}

export function isAdminPasswordValid(input: string): boolean {
  const configured = getConfiguredAdminPassword();
  if (!configured) return false;
  return safeStringEqual(configured, (input || '').trim());
}

function createLegacySessionSignature(payload: string): string {
  const configured = getConfiguredAdminPassword();
  if (!configured) return '';

  // Lightweight deterministic signature without Node-only crypto dependency.
  const source = `${configured}:${payload}`;
  let hash1 = 2166136261;
  let hash2 = 1315423911;

  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 16777619);
    hash2 ^= (hash2 << 5) + code + (hash2 >> 2);
  }

  return `${(hash1 >>> 0).toString(16).padStart(8, '0')}${(hash2 >>> 0).toString(16).padStart(8, '0')}`;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return globalThis
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createLegacySessionToken(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = Math.floor(Date.now() / 1000) + LEGACY_SESSION_TTL_SECONDS;
  const emailEncoded = toBase64Url(normalizedEmail);
  const payload = `${emailEncoded}:${expiresAt}`;
  const signature = createLegacySessionSignature(payload);
  return `${payload}.${signature}`;
}

function parseLegacySessionToken(token: string): { email: string; expiresAt: number } | null {
  if (!token) return null;
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) return null;
  const payload = token.slice(0, dotIndex);
  const signaturePart = token.slice(dotIndex + 1);

  const payloadParts = payload.split(':');
  if (payloadParts.length !== 2) return null;
  const [emailEncoded, expiresPart] = payloadParts;
  const expiresAt = Number.parseInt(expiresPart, 10);
  if (!emailEncoded || !Number.isFinite(expiresAt) || expiresAt <= 0 || !signaturePart) {
    return null;
  }

  const expectedSignature = createLegacySessionSignature(payload);
  if (!expectedSignature) return null;
  if (!safeStringEqual(expectedSignature, signaturePart)) return null;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return null;

  let emailRaw = '';
  try {
    emailRaw = fromBase64Url(emailEncoded);
  } catch {
    return null;
  }
  if (!emailRaw) return null;

  return {
    email: normalizeEmail(emailRaw),
    expiresAt,
  };
}

function getLegacySessionContextFromRequest(request: NextRequest): AdminAuthContext | null {
  const token = request.cookies.get(ADMIN_LEGACY_SESSION_COOKIE)?.value || '';
  const parsed = parseLegacySessionToken(token);
  if (!parsed) return null;

  const ownerEmail = getConfiguredOwnerEmails().includes(parsed.email)
    ? parsed.email
    : getConfiguredOwnerEmails()[0] || DEFAULT_OWNER_EMAILS[0];

  return {
    userId: `legacy:${ownerEmail}`,
    email: ownerEmail,
    role: 'owner',
    isOwner: true,
  };
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

function toAssignableRole(value: unknown): AssignableAdminRole | null {
  if (value === 'admin' || value === 'editor' || value === 'viewer') {
    return value;
  }
  return null;
}

function createMetadataMember(input: {
  email: string;
  role: AssignableAdminRole;
  isActive?: boolean;
  invitedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}): AdminRoleMember {
  const normalizedEmail = normalizeEmail(input.email);
  const now = new Date().toISOString();

  if (isOwnerEmail(normalizedEmail)) {
    return createOwnerMember(normalizedEmail, {
      created_at: input.createdAt || now,
      updated_at: input.updatedAt || now,
      invited_by: input.invitedBy || 'owner-policy',
    });
  }

  return {
    email: normalizedEmail,
    role: input.role,
    is_owner: false,
    is_active: input.isActive ?? true,
    invited_by: input.invitedBy || 'auth-metadata',
    created_at: input.createdAt || now,
    updated_at: input.updatedAt || now,
  };
}

function extractMetadataRoleMember(user: User, email: string): AdminRoleMember | null {
  const appMeta = user.app_metadata || {};
  const userMeta = user.user_metadata || {};

  const rawRole = appMeta[ADMIN_ROLE_META_KEY] ?? userMeta[ADMIN_ROLE_META_KEY];
  const role = toAssignableRole(rawRole);
  if (!role) return null;

  const rawIsActive = appMeta[ADMIN_ACTIVE_META_KEY] ?? userMeta[ADMIN_ACTIVE_META_KEY];
  const isActive =
    typeof rawIsActive === 'boolean' ? rawIsActive : rawIsActive === 'false' ? false : true;

  const invitedByRaw = appMeta[ADMIN_INVITED_BY_META_KEY] ?? userMeta[ADMIN_INVITED_BY_META_KEY];
  const invitedBy = typeof invitedByRaw === 'string' && invitedByRaw.trim() ? invitedByRaw : 'auth-metadata';
  const updatedAtRaw = appMeta[ADMIN_UPDATED_AT_META_KEY] ?? userMeta[ADMIN_UPDATED_AT_META_KEY];
  const updatedAt = typeof updatedAtRaw === 'string' && updatedAtRaw.trim() ? updatedAtRaw : undefined;

  return createMetadataMember({
    email,
    role,
    isActive,
    invitedBy,
    createdAt: user.created_at || updatedAt,
    updatedAt,
  });
}

async function setMetadataRoleForUser(input: {
  userId: string;
  email: string;
  role: AssignableAdminRole;
  isActive?: boolean;
  invitedBy?: string;
}): Promise<AdminRoleMember> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);

  const existingUserResponse = await supabase.auth.admin.getUserById(input.userId);
  if (existingUserResponse.error || !existingUserResponse.data?.user) {
    const errorMessage = existingUserResponse.error?.message || 'User not found';
    throw new Error(`Set metadata role failed: ${errorMessage}`);
  }

  const existingUser = existingUserResponse.data.user;
  const nextAppMetadata = {
    ...(existingUser.app_metadata || {}),
    [ADMIN_ROLE_META_KEY]: input.role,
    [ADMIN_ACTIVE_META_KEY]: input.isActive ?? true,
    [ADMIN_INVITED_BY_META_KEY]: input.invitedBy || 'self-signup',
    [ADMIN_UPDATED_AT_META_KEY]: now,
  };

  const updateResponse = await supabase.auth.admin.updateUserById(input.userId, {
    app_metadata: nextAppMetadata,
  });

  if (updateResponse.error) {
    throw new Error(`Set metadata role failed: ${updateResponse.error.message}`);
  }

  return createMetadataMember({
    email: normalizedEmail,
    role: input.role,
    isActive: input.isActive ?? true,
    invitedBy: input.invitedBy || 'self-signup',
    createdAt: existingUser.created_at || now,
    updatedAt: now,
  });
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

export function setLegacyAdminSessionCookie(response: NextResponse, email?: string) {
  const ownerEmail = normalizeEmail(email || getConfiguredOwnerEmails()[0] || DEFAULT_OWNER_EMAILS[0]);
  const token = createLegacySessionToken(ownerEmail);
  if (!token) {
    throw new Error('Admin password is not configured');
  }

  response.cookies.set(ADMIN_LEGACY_SESSION_COOKIE, token, {
    ...ADMIN_COOKIE_BASE_OPTIONS,
    maxAge: LEGACY_SESSION_TTL_SECONDS,
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
  response.cookies.set(ADMIN_LEGACY_SESSION_COOKIE, '', {
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
  const legacyContext = getLegacySessionContextFromRequest(request);
  if (legacyContext) {
    if (!isRoleAllowed(legacyContext.role, requiredRole)) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            error: `Forbidden. Required role: ${requiredRole}`,
            role: legacyContext.role,
          },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true,
      context: legacyContext,
    };
  }

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

    if (!roleMember) {
      roleMember = extractMetadataRoleMember(user, email);
    }
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
    if (isMissingAdminRolesTable(error.message, error.code)) {
      const membersMap = new Map<string, AdminRoleMember>();
      const now = new Date().toISOString();

      getConfiguredOwnerEmails().forEach((ownerEmail) => {
        membersMap.set(ownerEmail, {
          email: ownerEmail,
          role: 'owner',
          is_owner: true,
          is_active: true,
          invited_by: 'owner-policy',
          created_at: now,
          updated_at: now,
        });
      });

      let page = 1;
      const perPage = 200;

      for (;;) {
        const usersResponse = await supabase.auth.admin.listUsers({ page, perPage });
        if (usersResponse.error) break;

        const users = usersResponse.data?.users || [];
        if (users.length === 0) break;

        users.forEach((user) => {
          const email = user.email ? normalizeEmail(user.email) : '';
          if (!email) return;
          const member = extractMetadataRoleMember(user, email);
          if (!member) return;
          if (!member.is_active) return;
          membersMap.set(email, member);
        });

        if (users.length < perPage) break;
        page += 1;
        if (page > 20) break;
      }

      return Array.from(membersMap.values()).sort((a, b) => a.email.localeCompare(b.email));
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

export async function ensureRoleForAuthenticatedSessionUser(
  user: User,
  options: {
    allowSelfSignup?: boolean;
    defaultRole?: AssignableAdminRole;
  } = {}
): Promise<AdminRoleMember | null> {
  const email = extractUserEmail(user);
  if (!email) return null;

  let member = await resolveRoleByEmail(email, { allowBootstrap: true });
  if (member) {
    if (!member.is_active) return null;
    return member;
  }

  const metadataMember = extractMetadataRoleMember(user, email);
  if (metadataMember) {
    if (!metadataMember.is_active) return null;
    return metadataMember;
  }

  if (!options.allowSelfSignup) {
    return null;
  }

  const defaultRole = options.defaultRole === 'admin' ? 'editor' : options.defaultRole || 'viewer';

  try {
    member = await ensureRoleForSelfSignup(email, defaultRole);
    return member;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create role';
    if (!isMissingAdminRolesTable(message)) {
      throw error;
    }
  }

  return setMetadataRoleForUser({
    userId: user.id,
    email,
    role: defaultRole,
    isActive: true,
    invitedBy: 'self-signup',
  });
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
