'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/components/Container';
import { PrebidAd } from '@/components/PrebidAd';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { useTcfConsent } from '@/lib/useTcfConsent';
import { CMP_PROVIDER, isCmpConfigured, shouldBypassTcfForTest } from '@/lib/config/cmp';
import { useAdsProvider, isPrebidEnabled, isVoxEnabled } from '@/lib/ads-provider';
import {
  BIDIO_PREBID_GLOBAL,
  BIDIO_SDK_URL,
  BIDIO_WEBSITE_ID,
  PREBID_PLACEMENTS,
} from '@/lib/config/prebidPlacements';

interface Diagnostics {
  scriptTagPresent: boolean;
  bidioPresent: boolean;
  bidioApi: string[];
  pbjsPresent: boolean;
  pbjsVersion: string;
  adUnitCodes: string[];
  bids: Array<{ code: string; bidder: string; cpm: number; size: string; ttr: number }>;
  winners: Array<{ code: string; bidder: string; cpm: number; size: string }>;
  slots: Array<{ id: string; inDom: boolean; filled: boolean }>;
}

const EMPTY: Diagnostics = {
  scriptTagPresent: false,
  bidioPresent: false,
  bidioApi: [],
  pbjsPresent: false,
  pbjsVersion: '—',
  adUnitCodes: [],
  bids: [],
  winners: [],
  slots: [],
};

function collect(): Diagnostics {
  const w = window as any;
  const pbjs = w[BIDIO_PREBID_GLOBAL];
  const bidio = w.bidio;

  const bids: Diagnostics['bids'] = [];
  const winners: Diagnostics['winners'] = [];
  let adUnitCodes: string[] = [];
  let pbjsVersion = '—';

  if (pbjs) {
    try {
      pbjsVersion = pbjs.version || '—';
      adUnitCodes = (pbjs.adUnits || []).map((u: any) => u.code);

      const responses = typeof pbjs.getBidResponses === 'function' ? pbjs.getBidResponses() : {};
      Object.entries(responses).forEach(([code, value]: [string, any]) => {
        (value?.bids || []).forEach((bid: any) => {
          bids.push({
            code,
            bidder: bid.bidderCode || bid.bidder || '?',
            cpm: Number(bid.cpm) || 0,
            size: bid.size || `${bid.width}x${bid.height}`,
            ttr: Number(bid.timeToRespond) || 0,
          });
        });
      });

      const allWinners =
        typeof pbjs.getAllWinningBids === 'function' ? pbjs.getAllWinningBids() : [];
      allWinners.forEach((bid: any) => {
        winners.push({
          code: bid.adUnitCode,
          bidder: bid.bidderCode || bid.bidder || '?',
          cpm: Number(bid.cpm) || 0,
          size: bid.size || `${bid.width}x${bid.height}`,
        });
      });
    } catch {
      // Prebid internals differ between wrapper builds — partial data is fine.
    }
  }

  const slots = PREBID_PLACEMENTS.map((p) => {
    const el = document.getElementById(p.id);
    return {
      id: p.id,
      inDom: el !== null,
      filled: el ? el.children.length > 0 || el.querySelector('iframe') !== null : false,
    };
  });

  return {
    scriptTagPresent: document.querySelector('script[data-bidio-sdk]') !== null,
    bidioPresent: Boolean(bidio),
    bidioApi: bidio ? Object.keys(bidio) : [],
    pbjsPresent: Boolean(pbjs),
    pbjsVersion,
    adUnitCodes,
    bids: bids.sort((a, b) => b.cpm - a.cpm),
    winners,
    slots,
  };
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-200 py-2 dark:border-neutral-800">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      <span
        className={`text-right font-mono text-sm ${
          ok === undefined
            ? 'text-neutral-800 dark:text-neutral-200'
            : ok
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function PrebidTestClient() {
  const provider = useAdsProvider();
  const { consentState } = useCookieConsent();
  const tcfConsent = useTcfConsent();
  const [tcfApi, setTcfApi] = useState(false);
  const [diag, setDiag] = useState<Diagnostics>(EMPTY);
  const [elapsed, setElapsed] = useState(0);

  const hasAdConsent = consentState.hasConsented && consentState.preferences.advertising;

  useEffect(() => {
    const tick = () => {
      setDiag(collect());
      setTcfApi(typeof (window as any).__tcfapi === 'function');
      setElapsed((n) => n + 1);
    };
    tick();
    const intervalId = window.setInterval(tick, 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Container>
      <div className="mx-auto max-w-4xl py-10">
        <h1 className="mb-2 text-3xl font-bold">Bidio / Prebid — test page</h1>
        <p className="mb-8 text-neutral-500 dark:text-neutral-400">
          Refreshes every 2s ({elapsed}). Force a provider with{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">?ads=prebid</code>,{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">?ads=vox</code> or{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">?ads=both</code>.
        </p>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Environment</h2>
          <Row label="Ads provider" value={provider} />
          <Row label="Prebid active" value={String(isPrebidEnabled(provider))} ok={isPrebidEnabled(provider)} />
          <Row label="VOX active" value={String(isVoxEnabled(provider))} />
          <Row
            label="Advertising consent"
            value={hasAdConsent ? 'granted' : 'NOT granted — accept the cookie banner'}
            ok={hasAdConsent}
          />
          <Row label="websiteId" value={BIDIO_WEBSITE_ID} />
          <Row label="SDK url" value={BIDIO_SDK_URL} />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Consent / CMP</h2>
          <Row label="CMP vendor" value={CMP_PROVIDER} ok={CMP_PROVIDER !== 'none'} />
          <Row label="CMP configured" value={String(isCmpConfigured())} ok={isCmpConfigured()} />
          <Row label="window.__tcfapi" value={String(tcfApi)} ok={tcfApi} />
          <Row
            label="TCF consent"
            value={tcfConsent ?? 'n/a (no CMP)'}
            ok={tcfConsent === 'granted'}
          />
          <Row
            label="TEST bypass (defaultGdprScope=false)"
            value={shouldBypassTcfForTest() ? 'ACTIVE — test only, remove before launch' : 'off'}
          />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">SDK</h2>
          <Row label="Script tag injected" value={String(diag.scriptTagPresent)} ok={diag.scriptTagPresent} />
          <Row label="window.bidio" value={String(diag.bidioPresent)} ok={diag.bidioPresent} />
          <Row label="bidio API" value={diag.bidioApi.join(', ') || '—'} />
          <Row label={`window.${BIDIO_PREBID_GLOBAL}`} value={String(diag.pbjsPresent)} ok={diag.pbjsPresent} />
          <Row label="Prebid version" value={diag.pbjsVersion} />
          <Row label="Registered adUnits" value={diag.adUnitCodes.join(', ') || '—'} />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Slots</h2>
          {diag.slots.map((slot) => {
            const cfg = PREBID_PLACEMENTS.find((p) => p.id === slot.id);
            return (
              <Row
                key={slot.id}
                label={`#${slot.id} — ${cfg?.name ?? ''}${cfg?.confirmed ? '' : ' (id not confirmed)'}`}
                value={slot.filled ? 'filled' : slot.inDom ? 'empty' : 'not in DOM'}
                ok={slot.filled}
              />
            );
          })}
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Bids ({diag.bids.length})</h2>
          {diag.bids.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No bid responses yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead className="border-b border-neutral-300 dark:border-neutral-700">
                  <tr>
                    <th className="py-2 pr-4">adUnit</th>
                    <th className="py-2 pr-4">bidder</th>
                    <th className="py-2 pr-4">CPM</th>
                    <th className="py-2 pr-4">size</th>
                    <th className="py-2">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {diag.bids.map((bid, index) => (
                    <tr key={`${bid.code}-${bid.bidder}-${index}`} className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4">{bid.code}</td>
                      <td className="py-2 pr-4">{bid.bidder}</td>
                      <td className="py-2 pr-4">{bid.cpm.toFixed(2)}</td>
                      <td className="py-2 pr-4">{bid.size}</td>
                      <td className="py-2">{bid.ttr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Winning bids ({diag.winners.length})</h2>
          {diag.winners.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No winners rendered yet.</p>
          ) : (
            diag.winners.map((bid, index) => (
              <Row
                key={`${bid.code}-${index}`}
                label={bid.code}
                value={`${bid.bidder} — ${bid.cpm.toFixed(2)} — ${bid.size}`}
                ok
              />
            ))
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Live slots</h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Rendered in debug mode — outlined even when empty.
          </p>
          {PREBID_PLACEMENTS.map((placement) => (
            <div key={placement.id} className="mb-6">
              <div className="mb-1 font-mono text-xs text-neutral-400">
                #{placement.id} — {placement.name}
              </div>
              <PrebidAd id={placement.id} debug />
            </div>
          ))}
        </section>
      </div>
    </Container>
  );
}
