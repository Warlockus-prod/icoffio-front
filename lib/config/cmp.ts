/**
 * IAB TCF v2.2 Consent Management Platform.
 *
 * Why this exists: Bidio ships Prebid's `consentManagementTcf` module, which
 * refuses to run an auction without a TCF CMP. Verified live on
 * web.icoffio.com — every auction was cancelled with:
 *   "TCF2 CMP not found. Canceling auction as per consentManagement config."
 * The site's own banner writes `localStorage.icoffio_cookie_consent` and is NOT
 * TCF, so `window.__tcfapi` is undefined and no bidder is ever called.
 *
 * A CMP must be certified and registered with IAB Europe to get a CMP ID, so
 * the account has to be created by a human. Everything else — loading, consent
 * gating, and suppressing the site's own banner — is wired up here; only the id
 * below is missing.
 *
 * Deliberately a constant, not an env var: NEXT_PUBLIC_* only reaches the client
 * bundle through docker build args (see Dockerfile), which is exactly the trap
 * that broke the first Bidio deploy. The CMP id is public anyway.
 *
 * Applies only to PREBID_HOSTS — icoffio.com and app.icoffio.com keep their
 * existing banner and VOX stack untouched.
 */
export type CmpProvider = 'none' | 'google-funding-choices' | 'cookiebot' | 'usercentrics';

/**
 * Set to the chosen vendor once an account exists.
 *
 * Recommended: 'google-funding-choices' — free, TCF v2.2 certified, and this
 * project already serves Google ad products (the CSP allowlists
 * pagead2.googlesyndication.com and doubleclick). The id is the AdSense/Ad
 * Manager publisher id, e.g. "pub-1234567890123456".
 *
 * Alternatives: 'cookiebot' (id = CBID / domain group GUID),
 * 'usercentrics' (id = settings id).
 */
export const CMP_PROVIDER: CmpProvider = 'none';

/** Vendor-specific id. Empty means the CMP stays disabled. */
export const CMP_ID = '';

/**
 * HISTORY — the TCF wall, and what actually solved it.
 *
 * On the old `bidio-sdk-dev.js` build every auction died with "TCF2 CMP not
 * found. Canceling auction as per consentManagement config." We tried relaxing
 * Prebid's `defaultGdprScope` from the page (v10.23.0–10.23.3). It does not
 * work: the override held — pbjs reported `{cmpApi:'iab', timeout:1000,
 * defaultGdprScope:false}` — and the auction was still cancelled, auctionInit
 * 0. Prebid cancels because the CMP is unreachable; `defaultGdprScope` only
 * decides what `gdprApplies` becomes *after* a CMP replies. That code is gone.
 *
 * The lazy build the partner shipped on 2026-10-28 has a first-class switch:
 * `BIDIO_LAZY_CONFIG.gdprEnabled = false` skips consentManagement entirely.
 * See `BIDIO_GDPR_ENABLED` in lib/config/prebidPlacements.ts — that is the
 * supported test path, and the one in use.
 *
 * For real traffic the answer is still a genuine TCF signal: set
 * CMP_PROVIDER + CMP_ID above and turn `BIDIO_GDPR_ENABLED` back on.
 * `cmpApi: 'static'` with a hand-written consentData would also "work" — do not
 * do it. That is a fabricated GDPR consent string sent to real bidders.
 */

export interface CmpScript {
  src: string;
  attributes: Record<string, string>;
}

/** Build the loader tag for the configured vendor, or null when unconfigured. */
export function getCmpScript(): CmpScript | null {
  if (CMP_PROVIDER === 'none' || !CMP_ID) return null;

  switch (CMP_PROVIDER) {
    case 'google-funding-choices':
      return {
        src: `https://fundingchoicesmessages.google.com/i/${CMP_ID}?ers=1`,
        attributes: {},
      };
    case 'cookiebot':
      return {
        src: 'https://consent.cookiebot.com/uc.js',
        attributes: { 'data-cbid': CMP_ID, 'data-framework': 'TCFv2.2' },
      };
    case 'usercentrics':
      return {
        src: 'https://web.cmp.usercentrics.eu/ui/loader.js',
        attributes: { id: 'usercentrics-cmp', 'data-settings-id': CMP_ID },
      };
    default:
      return null;
  }
}

/** True once a vendor and id are set, so the app can switch consent sources. */
export function isCmpConfigured(): boolean {
  return getCmpScript() !== null;
}

/** Hosts the CMP script must be reachable from, for the CSP allowlist. */
export const CMP_CSP_HOSTS: Record<Exclude<CmpProvider, 'none'>, string[]> = {
  'google-funding-choices': [
    'https://fundingchoicesmessages.google.com',
    'https://*.googlesyndication.com',
  ],
  cookiebot: ['https://consent.cookiebot.com', 'https://consentcdn.cookiebot.com'],
  usercentrics: ['https://web.cmp.usercentrics.eu', 'https://api.usercentrics.eu'],
};
