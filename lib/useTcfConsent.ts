'use client';

import { useEffect, useState } from 'react';
import { isCmpConfigured } from './config/cmp';

export type TcfConsentStatus = 'pending' | 'granted' | 'denied';

declare global {
  interface Window {
    __tcfapi?: (
      command: string,
      version: number,
      callback: (data: any, success: boolean) => void,
      parameter?: unknown
    ) => void;
  }
}

/**
 * Advertising consent as reported by an IAB TCF v2.2 CMP.
 *
 * Returns null when no CMP is configured, so callers keep using the site's own
 * cookie banner and nothing changes for the VOX deployments.
 *
 * We gate on TCF purpose 1 ("Store and/or access information on a device"),
 * which is what loading a bidding wrapper actually needs. Per-vendor and
 * per-purpose enforcement for the auction itself is Prebid's job, not ours.
 */
export function useTcfConsent(): TcfConsentStatus | null {
  const configured = isCmpConfigured();
  const [status, setStatus] = useState<TcfConsentStatus>('pending');

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;
    let listenerId: number | null = null;

    const apply = (tcData: any, success: boolean) => {
      if (cancelled || !success || !tcData) return;

      // 'tcloaded'    — a stored decision was found
      // 'useractioncomplete' — the user just answered the dialog
      // 'cmpuishown'  — dialog is open, no decision yet
      if (tcData.eventStatus === 'cmpuishown') {
        setStatus('pending');
        return;
      }

      if (typeof tcData.listenerId === 'number') listenerId = tcData.listenerId;

      const purposeOne = tcData.purpose?.consents?.['1'] === true;
      const gdprApplies = tcData.gdprApplies !== false;

      // Outside the GDPR scope the CMP reports no consents at all; that is not
      // a refusal, so treat it as permitted.
      setStatus(!gdprApplies || purposeOne ? 'granted' : 'denied');
    };

    const attach = () => {
      if (cancelled) return false;
      if (typeof window.__tcfapi !== 'function') return false;
      window.__tcfapi('addEventListener', 2, apply);
      return true;
    };

    if (!attach()) {
      // The CMP stub can land a moment after this component mounts.
      const pollId = window.setInterval(() => {
        if (attach()) window.clearInterval(pollId);
      }, 200);
      const stopId = window.setTimeout(() => {
        window.clearInterval(pollId);
        if (!cancelled && typeof window.__tcfapi !== 'function') {
          console.warn('[CMP] __tcfapi never appeared — auctions will be cancelled by Prebid');
        }
      }, 15000);

      return () => {
        cancelled = true;
        window.clearInterval(pollId);
        window.clearTimeout(stopId);
      };
    }

    return () => {
      cancelled = true;
      if (listenerId !== null && typeof window.__tcfapi === 'function') {
        window.__tcfapi('removeEventListener', 2, () => {}, listenerId);
      }
    };
  }, [configured]);

  return configured ? status : null;
}
