/**
 * SSRF guard for any endpoint that fetches a user-supplied URL.
 *
 * Protects against:
 *   - Reaching the loopback interface (localhost, 127.0.0.1, ::1)
 *   - Cloud metadata services (169.254.169.254 — AWS/GCP/Azure)
 *   - RFC 1918 private subnets (10/8, 172.16/12, 192.168/16)
 *   - IPv6 link-local (fe80::/10), unique-local (fc00::/7), loopback (::1)
 *   - Non-HTTP(S) protocols (file:, gopher:, dict:, etc.)
 *
 * Used by:
 *   - app/api/admin/parse-url/route.ts        (admin URL parser)
 *   - app/api/check-url/route.ts              (admin link checker)
 *   - app/api/info/fetch-feeds/route.ts       (RSS feed fetcher)
 *   - lib/info/feed-fetcher.ts                (called from cron)
 *
 * Usage:
 *   const safe = await assertSafeRemoteUrl(url);
 *   if (!safe.ok) return NextResponse.json({ error: safe.reason }, { status: 400 });
 */

import { lookup } from 'dns/promises';

export interface UrlGuardResult {
  ok: boolean;
  /** Human-readable reason — safe to send to admin UI but never to public. */
  reason?: string;
  /** Resolved IP (for logging/diagnostics). */
  resolvedIp?: string;
}

/**
 * Returns true if the given IPv4 string falls in a private/reserved range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  // Loopback 127.0.0.0/8
  if (a === 127) return true;
  // Private ranges (RFC 1918)
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // Link-local 169.254.0.0/16 (incl. cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // CGNAT 100.64.0.0/10
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Multicast 224/4 + reserved 240/4
  if (a >= 224) return true;
  // 0.0.0.0/8
  if (a === 0) return true;
  return false;
}

/**
 * Returns true if the given IPv6 string is loopback/link-local/unique-local.
 * Checks normalized hex prefixes only — sufficient for guard duty.
 */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;            // loopback
  if (lower === '::') return true;             // unspecified
  if (lower.startsWith('fe80:')) return true;  // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
  if (lower.startsWith('ff')) return true;     // multicast ff00::/8
  // ::ffff:127.0.0.1 IPv4-mapped — extract IPv4 part
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback',
]);

/**
 * Validate a user-supplied URL before any server-side fetch.
 *
 * @param raw         — the raw URL string from request body / query
 * @param opts.allowHttp  — accept http:// in addition to https://. Default false (strict).
 * @returns           — { ok, reason?, resolvedIp? }
 */
export async function assertSafeRemoteUrl(
  raw: string,
  opts: { allowHttp?: boolean } = {},
): Promise<UrlGuardResult> {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, reason: 'URL is empty' };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'URL is malformed' };
  }

  // Protocol whitelist
  const allowedProtocols = opts.allowHttp ? ['http:', 'https:'] : ['https:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return { ok: false, reason: `Only ${allowedProtocols.join('/')} is allowed (got ${parsed.protocol})` };
  }

  // Block credentials in URL (e.g., https://user:pass@host)
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URL must not embed credentials' };
  }

  // Node WHATWG URL keeps brackets around IPv6 hostnames (e.g. `[::1]`).
  // Strip them so our checks see the bare address.
  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // Reject named loopback aliases
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: `Hostname ${hostname} is blocked` };
  }

  // If hostname is already a literal IP — check directly
  // IPv4 literal pattern
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { ok: false, reason: `IPv4 ${hostname} is in a private/reserved range`, resolvedIp: hostname };
    }
    return { ok: true, resolvedIp: hostname };
  }
  // IPv6 literal pattern (brackets already stripped above)
  if (hostname.includes(':')) {
    if (isPrivateIPv6(hostname)) {
      return { ok: false, reason: `IPv6 ${hostname} is in a private/reserved range`, resolvedIp: hostname };
    }
    return { ok: true, resolvedIp: hostname };
  }

  // DNS resolve and verify all returned addresses are public
  try {
    const records = await lookup(hostname, { all: true });
    if (!records.length) {
      return { ok: false, reason: `DNS lookup for ${hostname} returned no records` };
    }
    for (const rec of records) {
      const isPrivate = rec.family === 4 ? isPrivateIPv4(rec.address) : isPrivateIPv6(rec.address);
      if (isPrivate) {
        return {
          ok: false,
          reason: `Hostname ${hostname} resolves to private/reserved IP ${rec.address}`,
          resolvedIp: rec.address,
        };
      }
    }
    return { ok: true, resolvedIp: records[0].address };
  } catch (err: any) {
    return { ok: false, reason: `DNS lookup failed for ${hostname}: ${err?.message ?? err}` };
  }
}
