'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AD_PLACEMENTS,
  IN_IMAGE_PLACE_ID,
  UNUSED_VOX_SLOTS,
} from '@/lib/config/adPlacements';

/**
 * Advertising — what the site requests from VOX and what came back.
 *
 * Inventory is read-only on purpose: places live in lib/config/adPlacements.ts
 * and must mirror the VOX publisher panel. The old toggles here only wrote to
 * this browser's localStorage and never changed the public site.
 */

interface DailyRow { day: string; filled: number; empty: number }
interface PlaceRow { place_id: string; format: string; device: string; host: string; filled: number; empty: number; last_filled: string | null }

const VOX_PANEL_URL = 'https://partners.voxexchange.io/monetization/places';
const HYBRID_CONSOLE_URL = 'https://console.hybrid.ai/';

function fillRate(filled: number, empty: number): string {
  const total = filled + empty;
  return total ? `${Math.round((filled / total) * 100)}%` : '—';
}

export default function AdvertisingManager() {
  const [days, setDays] = useState(14);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ad-stats?days=${days}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setDaily(json.daily);
      setPlaces(json.places);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load ad statistics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => daily.reduce(
    (acc, d) => ({ filled: acc.filled + d.filled, empty: acc.empty + d.empty }),
    { filled: 0, empty: 0 }
  ), [daily]);

  const nameByPlace = useMemo(() => {
    const map = new Map<string, string>([[IN_IMAGE_PLACE_ID, 'In-image on article photos']]);
    for (const ad of AD_PLACEMENTS) if (!map.has(ad.placeId)) map.set(ad.placeId, ad.name);
    return map;
  }, []);

  const inventory = [
    {
      id: 'in-image', name: 'In-image on article photos', format: 'in-image', voxSlot: 'InImage Ad slot #1',
      placeId: IN_IMAGE_PLACE_ID, location: 'article', device: 'both', enabled: true,
    },
    ...AD_PLACEMENTS,
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advertising</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Auction outcomes counted by the site itself, per VOX place. Billable impressions and revenue are in the VOX
            publisher panel; campaign delivery is in the Hybrid console. If the site shows fills but VOX shows no
            impressions, the issue is on their side, and vice versa.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href={VOX_PANEL_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">VOX publisher panel ↗</a>
          <a href={HYBRID_CONSOLE_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">Hybrid console ↗</a>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fill on the site</h3>
          <div className="flex items-center gap-2 text-sm">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1.5 ${days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                {d} days
              </button>
            ))}
            <button onClick={load} className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200">Refresh</button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        ) : loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Filled (creative shown)" value={totals.filled.toLocaleString()} />
              <Stat label="Empty (no ad from VOX)" value={totals.empty.toLocaleString()} />
              <Stat label="Fill rate" value={fillRate(totals.filled, totals.empty)} />
            </div>

            {places.length === 0 ? (
              <p className="text-sm text-gray-500">No auctions recorded in this period. Counting starts with visitors who accept advertising cookies.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr><th className="py-2">Place</th><th>Format</th><th>Device</th><th>Host</th><th className="text-right">Filled</th><th className="text-right">Empty</th><th className="text-right">Fill rate</th><th className="text-right">Last fill</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {places.map((p) => (
                      <tr key={`${p.place_id}-${p.device}-${p.host}`} className="text-gray-800 dark:text-gray-200">
                        <td className="py-2">{nameByPlace.get(p.place_id) || p.place_id}</td>
                        <td>{p.format}</td><td>{p.device}</td><td>{p.host}</td>
                        <td className="text-right tabular-nums">{p.filled}</td>
                        <td className="text-right tabular-nums">{p.empty}</td>
                        <td className="text-right tabular-nums">{fillRate(p.filled, p.empty)}</td>
                        <td className="text-right tabular-nums">{p.last_filled || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {daily.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500"><tr><th className="py-2">Day</th><th className="text-right">Filled</th><th className="text-right">Empty</th><th className="text-right">Fill rate</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {daily.map((d) => (
                      <tr key={d.day} className="text-gray-800 dark:text-gray-200">
                        <td className="py-2 tabular-nums">{d.day}</td>
                        <td className="text-right tabular-nums">{d.filled}</td>
                        <td className="text-right tabular-nums">{d.empty}</td>
                        <td className="text-right tabular-nums">{fillRate(d.filled, d.empty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ad places</h3>
        <p className="mb-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
          Defined in <code>lib/config/adPlacements.ts</code>; each must match a slot of the same size in the VOX panel.
          Changing them is a code change and a deploy.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr><th className="py-2">Place</th><th>Format</th><th>VOX slot</th><th>PlaceID</th><th>Page</th><th>Device</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {inventory.map((ad) => (
                <tr key={ad.id} className="text-gray-800 dark:text-gray-200">
                  <td className="py-2">{ad.name}</td>
                  <td>{ad.format}</td>
                  <td>{ad.voxSlot}</td>
                  <td className="font-mono text-xs">{ad.placeId}</td>
                  <td>{ad.location}</td>
                  <td>{ad.device}</td>
                  <td>{ad.enabled ? 'On' : 'Off'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {UNUSED_VOX_SLOTS.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium">VOX slots not used on the site:</p>
            <ul className="mt-1 list-disc pl-5">
              {UNUSED_VOX_SLOTS.map((s) => <li key={s.placeId}>{s.voxSlot} ({s.placeId}) — {s.reason}</li>)}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
