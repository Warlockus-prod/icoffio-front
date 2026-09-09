/**
 * Cookie-consent storage contract.
 *
 * Shared by the React hook (lib/useCookieConsent.ts) and the inline <head>
 * script in app/[locale]/layout.tsx that starts the VOX SDK before hydration.
 * Both must read the same key, version and expiry rules — import them from
 * here, never re-declare them.
 *
 * Server-safe: no React, no DOM access at module level.
 */

export const CONSENT_KEY = 'icoffio_cookie_consent';
export const CONSENT_VERSION = '1.0';

/** How long an accepted choice is honoured. */
export const CONSENT_EXPIRY_DAYS = 365;

/**
 * A refusal is re-solicited sooner. Before v10.23.2 "Reject All" was stored with
 * the same 365-day expiry as an acceptance, so one click silenced the banner —
 * and every ad request — from that browser for a year.
 */
export const REJECT_EXPIRY_DAYS = 30;

export const VOX_SDK_URL = 'https://st.hbrd.io/ssp.js';

export interface StoredPreferences {
  necessary: boolean;
  analytics: boolean;
  advertising: boolean;
}

export interface StoredConsent {
  hasConsented: boolean;
  timestamp?: number;
  preferences: StoredPreferences;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Expiry timestamp for a choice: a year for a grant, a month for a refusal. */
export function consentExpiryMs(preferences: StoredPreferences, now: number = Date.now()): number {
  const granted = preferences.analytics || preferences.advertising;
  return now + (granted ? CONSENT_EXPIRY_DAYS : REJECT_EXPIRY_DAYS) * DAY_MS;
}

/**
 * Parse the raw localStorage value. Returns null for a missing, malformed,
 * expired or old-version record — callers treat null as "ask again".
 */
export function readStoredConsent(raw: string | null | undefined, now: number = Date.now()): StoredConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.expiryDate === 'number' && parsed.expiryDate < now) return null;
    const prefs = (parsed.preferences && typeof parsed.preferences === 'object'
      ? parsed.preferences
      : {}) as Record<string, unknown>;
    return {
      hasConsented: parsed.hasConsented === true,
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : undefined,
      preferences: {
        necessary: true,
        analytics: prefs.analytics === true,
        advertising: prefs.advertising === true,
      },
    };
  } catch {
    return null;
  }
}

export function hasAdvertisingConsent(raw: string | null | undefined, now: number = Date.now()): boolean {
  const consent = readStoredConsent(raw, now);
  return !!consent && consent.hasConsented && consent.preferences.advertising;
}

/**
 * Inline script for <head>: when advertising consent is already stored, start
 * downloading the VOX SDK with the document instead of from a post-hydration
 * React effect. Measured on the live site the SDK used to be requested at
 * ~770ms, after the load event; every millisecond here is time the creative
 * gets on screen before the reader scrolls past the hero.
 *
 * It only primes `window._tx.cmds` and adds the <script> tag — AdManager still
 * owns placement registration and init, and finds the tag by its data attribute.
 * The validation mirrors readStoredConsent() above; keep them in step.
 */
export function buildEarlyVoxLoaderScript(): string {
  const key = JSON.stringify(CONSENT_KEY);
  const version = JSON.stringify(CONSENT_VERSION);
  const src = JSON.stringify(VOX_SDK_URL);
  return (
    '(function(){try{' +
    `var r=localStorage.getItem(${key});if(!r)return;` +
    'var c=JSON.parse(r);if(!c||typeof c!=="object")return;' +
    `if(c.version!==${version})return;` +
    'if(typeof c.expiryDate==="number"&&c.expiryDate<Date.now())return;' +
    'if(c.hasConsented!==true||!c.preferences||c.preferences.advertising!==true)return;' +
    'window._tx=window._tx||{};window._tx.cmds=window._tx.cmds||[];' +
    'if(document.querySelector(\'script[data-vox-ssp="1"]\'))return;' +
    `var s=document.createElement("script");s.async=true;s.src=${src};` +
    's.setAttribute("data-vox-ssp","1");s.setAttribute("fetchpriority","high");' +
    'document.head.appendChild(s);' +
    '}catch(e){}})();'
  );
}
