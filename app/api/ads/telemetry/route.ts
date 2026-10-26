/**
 * Ad accounting beacon — counts VOX auction outcomes per place, seen by the page.
 *
 *   POST /api/ads/telemetry
 *   Body: { events: [{ placeId, format, outcome: 'filled'|'empty', device: 'desktop'|'mobile' }] }
 *
 * Public (sent from every consented pageview), rate-limited, accepts only
 * PlaceIDs from lib/config/adPlacements.ts. Never blocks the page: failures are silent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';
import { checkRateLimit } from '@/lib/api-rate-limiter';
import { getKnownPlaceIds } from '@/lib/config/adPlacements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KNOWN_HOSTS = new Set(['icoffio.com', 'app.icoffio.com', 'web.icoffio.com']);
const MAX_EVENTS = 20;

interface TelemetryEvent { placeId?: unknown; format?: unknown; outcome?: unknown; device?: unknown }

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, 'PUBLIC_API');
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let body: { device?: unknown; events?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0].replace(/^www\./, '');
  if (!KNOWN_HOSTS.has(host)) return NextResponse.json({ ok: false }, { status: 400 });
  const fallbackDevice = body.device === 'mobile' ? 'mobile' : 'desktop';
  const known = getKnownPlaceIds();

  const rows = (Array.isArray(body.events) ? body.events : [])
    .slice(0, MAX_EVENTS)
    .map((e: TelemetryEvent) => ({
      placeId: typeof e.placeId === 'string' ? e.placeId : '',
      format: typeof e.format === 'string' ? e.format.slice(0, 20) : '',
      outcome: e.outcome === 'filled' ? 'filled' : e.outcome === 'empty' ? 'empty' : '',
      device: e.device === 'mobile' ? 'mobile' : e.device === 'desktop' ? 'desktop' : fallbackDevice,
    }))
    .filter((e) => known.has(e.placeId) && e.format && e.outcome);

  if (rows.length === 0) return NextResponse.json({ ok: true, stored: 0 });

  try {
    const pool = getPool();
    for (const row of rows) {
      await pool.query(
        `INSERT INTO ad_slot_daily (day, host, place_id, format, device, filled, empty)
         VALUES ((NOW() AT TIME ZONE 'Europe/Warsaw')::date, $1, $2, $3, $4, $5, $6)
         ON CONFLICT (day, host, place_id, device) DO UPDATE SET
           filled = ad_slot_daily.filled + EXCLUDED.filled,
           empty  = ad_slot_daily.empty + EXCLUDED.empty,
           format = EXCLUDED.format,
           updated_at = NOW()`,
        [host, row.placeId, row.format, row.device, row.outcome === 'filled' ? 1 : 0, row.outcome === 'empty' ? 1 : 0]
      );
    }
    return NextResponse.json({ ok: true, stored: rows.length });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
