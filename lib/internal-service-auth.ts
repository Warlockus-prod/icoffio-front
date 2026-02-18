import type { NextRequest } from 'next/server';

function parseBearerToken(authHeader: string | null): string {
  if (!authHeader) return '';
  const value = authHeader.trim();
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

export function getInternalServiceSecret(): string {
  return (
    process.env.INTERNAL_API_SECRET ||
    process.env.TELEGRAM_WORKER_SECRET ||
    process.env.CRON_SECRET ||
    ''
  ).trim();
}

export function isInternalServiceRequest(request: NextRequest): boolean {
  const configuredSecret = getInternalServiceSecret();
  if (!configuredSecret) return false;

  const headerToken = (request.headers.get('x-internal-service-secret') || '').trim();
  const bearerToken = parseBearerToken(request.headers.get('authorization'));

  return headerToken === configuredSecret || bearerToken === configuredSecret;
}

export function buildInternalServiceHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  const configuredSecret = getInternalServiceSecret();
  if (!configuredSecret) {
    return headers;
  }

  return {
    ...headers,
    'x-internal-service-secret': configuredSecret,
  };
}
