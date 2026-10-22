/* eslint-disable no-console */
/**
 * Read-only live ad audit. Never clicks creatives, calls the ad SDK, fabricates
 * impressions, or changes server state. Each context is an ordinary pageview.
 *
 * npm run ad:live-debug
 * AD_DEBUG_BASE_URL=http://localhost:3000 AD_DEBUG_LOCALES=en \
 *   AD_DEBUG_DEVICES=desktop AD_DEBUG_WAIT_MS=3000 npm run ad:live-debug
 *
 * Default: primary icoffio.com/app.icoffio.com, EN/PL, desktop/mobile. Includes
 * direct article load, home -> article client navigation, consent withdrawal,
 * and a fresh browser with rejected consent. Images/report stay in output/.
 */
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const BASE_URLS = process.env.AD_DEBUG_BASE_URL
  ? [process.env.AD_DEBUG_BASE_URL.replace(/\/$/, '')]
  : ['https://icoffio.com', 'https://app.icoffio.com'];
const OUTPUT_PATH = path.resolve(process.env.AD_DEBUG_OUTPUT ||
  path.join(process.cwd(), 'output', 'playwright', 'live-ad-debug-report.json'));
const LOCALES = (process.env.AD_DEBUG_LOCALES || 'en,pl').split(',').filter(Boolean);
const DEVICE_NAMES = (process.env.AD_DEBUG_DEVICES || 'desktop,mobile').split(',').filter(Boolean);
const WAIT_MS = Math.min(30000, Math.max(1000, Number(process.env.AD_DEBUG_WAIT_MS) || 9000));
const SCREENSHOTS = process.env.AD_DEBUG_SCREENSHOTS !== 'false';
const TARGETS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  tablet: { ...devices['iPad Pro 11'] },
  mobile: { ...devices['iPhone 12'] },
};
const AD_HOST = /(?:^|\.)(?:hbrd\.io|hybrid\.ai|bidio\.pl|doubleclick\.net|googlesyndication\.com|googletagservices\.com|adtrafficquality\.google|fundingchoicesmessages\.google\.com)$/i;
const IN_IMAGE_PLACE_ID = '63d93bb54d506e95f039e2e3';
const CONFIGURED_FORMATS = new Map([...fs.readFileSync(
  path.join(__dirname, '..', 'lib', 'config', 'adPlacements.ts'), 'utf8'
).matchAll(/placeId:\s*['\"]([a-f\d]{24})['\"],?\s*format:\s*['\"]([^'\"]+)/g)]
  .map((match) => [match[1], match[2]]));

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch { return String(raw || '').slice(0, 120); }
}

function safeText(raw) {
  // Do not persist query strings, consent strings, opaque ad tags, visitor IDs,
  // or browser session identifiers in the report/terminal.
  return String(raw || '').replace(/https?:\/\/[^\s"'<>]+/g, safeUrl).slice(0, 1000);
}

function makeConsent(advertising) {
  const now = Date.now();
  return {
    hasConsented: true,
    timestamp: now,
    preferences: { necessary: true, analytics: advertising, advertising },
    version: '1.0',
    expiryDate: now + 30 * 24 * 60 * 60 * 1000,
  };
}

function describeRequest(request) {
  const url = new URL(request.url());
  const auction = /^(?:ssp\.hybrid\.ai|ssp\.hbrd\.io)$/.test(url.hostname) && url.pathname === '/';
  let payload;
  if (auction) {
    try {
      // Hybrid's query has a binary prefix followed by a JSON object, all
      // base64url encoded. Extract only placement/public-page metadata.
      const token = decodeURIComponent(url.search.slice(1).split('&')[0].split('=')[0]);
      // SDK versions join independently encoded binary/JSON segments. Try
      // each base64 alignment and extract only allowlisted public fields.
      const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
      for (let offset = 0; offset < 4 && !payload; offset += 1) {
        const decoded = Buffer.from(normalized.slice(offset), 'base64').toString('utf8');
        const place = decoded.match(/"PlaceId":"([a-f\d]{24})"/i);
        if (place) {
          const pageUrl = decoded.match(/"Url":"([^"]+)"/);
          payload = { PlaceId: place[1], Browser: { Url: pageUrl?.[1] } };
        }
      }
    } catch { /* Unknown SDK version: retain an unattributed auction safely. */ }
  }
  const candidate = payload?.PlaceId;
  const placeId = typeof candidate === 'string' && /^[a-f\d]{24}$/i.test(candidate) ? candidate : null;
  return {
    url: safeUrl(request.url()),
    kind: url.pathname === '/api/video/preroll' ? 'video-preroll' : auction ? 'ssp-auction' : 'ad-resource',
    resourceType: request.resourceType(),
    ...(auction ? {
      placeId,
      format: placeId === IN_IMAGE_PLACE_ID ? 'in-image' : null,
      page: payload?.Browser?.Url ? safeUrl(payload.Browser.Url) : null,
      gdprConsentPresent: Boolean(url.searchParams.get('gdpr_cnsnt')),
    } : {}),
  };
}

async function prepareContext(browser, options, advertising) {
  const context = await browser.newContext(options);
  await context.addInitScript((consent) => {
    if (window.top === window) {
      localStorage.setItem('icoffio_cookie_consent', JSON.stringify(consent));
    }
    window.__icoffioAdAuditCsp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      let blocked = event.blockedURI;
      try { const url = new URL(blocked); blocked = url.origin + url.pathname; } catch { /* inline/eval */ }
      window.__icoffioAdAuditCsp.push({ directive: event.effectiveDirective, blocked });
    });
  }, makeConsent(advertising));
  return context;
}

function attachNetwork(page, run) {
  const pending = new Set();
  const requestPhases = new WeakMap();
  page.on('request', (request) => requestPhases.set(request, { phase: run.phase, atMs: Date.now() - run.startedAt }));
  const relevant = (raw) => {
    const url = new URL(raw);
    return AD_HOST.test(url.hostname) || url.pathname === '/api/video/preroll' || /prebid.*currency/i.test(url.pathname);
  };
  page.on('response', (response) => {
    if (!relevant(response.url())) return;
    const item = { ...requestPhases.get(response.request()), ...describeRequest(response.request()), status: response.status() };
    run.network.push(item);
    if (item.kind === 'video-preroll') {
      const task = response.json().then((data) => {
        item.result = {
          success: data?.success === true,
          reason: typeof data?.reason === 'string' ? safeText(data.reason) : null,
          error: typeof data?.error === 'string' ? safeText(data.error) : null,
          vastEmpty: data?.vastEmpty === true,
          timedOut: data?.timedOut === true,
          hasMedia: typeof data?.mediaUrl === 'string' && data.mediaUrl.length > 0,
        };
      }).catch(() => { item.result = { error: 'Response was not readable JSON' }; });
      pending.add(task);
      task.finally(() => pending.delete(task));
    }
  });
  page.on('requestfailed', (request) => {
    if (relevant(request.url())) run.network.push({
      ...requestPhases.get(request), ...describeRequest(request),
      failure: request.failure()?.errorText || 'unknown',
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      run.console.push({ phase: run.phase, type: message.type(), text: safeText(message.text()) });
    }
  });
  page.on('pageerror', (error) => run.errors.push({ phase: run.phase, text: safeText(error.message) }));
  return async () => { await Promise.allSettled([...pending]); };
}

async function collectState(page) {
  return page.evaluate((inImagePlaceId) => {
    const size = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
    };
    const displayed = (element) => {
      if (!element || element.getClientRects().length === 0) return false;
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const onScreenFraction = (element) => {
      const r = element.getBoundingClientRect();
      const area = r.width * r.height;
      return area ? Math.round(Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) *
        Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / area * 1000) / 1000 : 0;
    };
    let advertising = false;
    try { advertising = JSON.parse(localStorage.getItem('icoffio_cookie_consent'))?.preferences?.advertising === true; } catch { /* no consent */ }
    const slots = [...document.querySelectorAll('[data-hyb-ssp-ad-place]')].map((container) => {
      const sdkStatus = container.getAttribute('data-hyb-ssp-ad-place-status') || '';
      const appStatus = container.getAttribute('data-ad-status') || '';
      const creatives = [...container.querySelectorAll('iframe,img,video,canvas')];
      return {
        placeId: container.getAttribute('data-hyb-ssp-ad-place'),
        format: container.getAttribute('data-ad-format') || '',
        placement: container.getAttribute('data-ad-placement') || '',
        appStatus, sdkStatus,
        actualStatus: sdkStatus === 'empty' ? 'no-fill' : appStatus === 'unsuitable' ? 'unsuitable' :
          creatives.some(displayed) ? 'rendered' : !advertising ? 'consent-denied' : appStatus || sdkStatus || 'unregistered',
        responsiveHidden: container.getClientRects().length === 0,
        visible: displayed(container),
        onScreenFraction: onScreenFraction(container),
        containerSize: size(container),
        creativeCount: creatives.length,
        creatives: creatives.slice(0, 3).map((creative) => ({ tag: creative.tagName, size: size(creative), visible: displayed(creative) })),
      };
    });
    const hero = document.querySelector('article img, main img');
    const tx = window._tx;
    return {
      url: location.origin + location.pathname,
      advertisingConsent: advertising,
      sdkLoaded: typeof tx?.init === 'function',
      hasTcfApi: typeof window.__tcfapi === 'function',
      scripts: [...document.scripts].filter((script) => /hbrd|hybrid|bidio|prebid|doubleclick/.test(script.src))
        .map((script) => { const url = new URL(script.src); return url.origin + url.pathname; }),
      inImage: {
        placeId: inImagePlaceId,
        integrationPresent: Boolean(tx?.integrations?.inImage),
        hero: hero ? { naturalWidth: hero.naturalWidth, size: size(hero), onScreenFraction: onScreenFraction(hero) } : null,
        overlayElements: document.querySelectorAll('[class*="in-image"],[id*="in-image"],[class*="hyb-inimage"]').length,
      },
      slots,
      videoElements: [...document.querySelectorAll('video')].map((video) => ({
        visible: displayed(video), paused: video.paused, readyState: video.readyState,
        errorCode: video.error?.code || null, size: size(video),
      })),
      csp: window.__icoffioAdAuditCsp || [],
    };
  }, IN_IMAGE_PLACE_ID);
}

async function snapshot(page, run, label) {
  const state = { label, ...await collectState(page) };
  if (SCREENSHOTS) {
    const filename = `${run.id}-${label}.png`;
    state.screenshot = path.join(path.dirname(OUTPUT_PATH), filename);
    await page.screenshot({ path: state.screenshot, fullPage: false, timeout: 15000 });
  }
  run.states.push(state);
}

async function firstArticlePath(page, locale) {
  const override = process.env.AD_DEBUG_ARTICLE_PATH;
  if (override) return override;
  const href = await page.locator(`a[href*="/${locale}/article/"]`).first().getAttribute('href', { timeout: 10000 });
  if (!href) throw new Error(`No ${locale} article link found on ${safeUrl(page.url())}`);
  return new URL(href, page.url()).pathname;
}

function summarize(run) {
  const formats = new Map(run.states.flatMap((state) => state.slots.map((slot) => [slot.placeId, slot.format])));
  const auctions = {};
  for (const item of run.network.filter((entry) => entry.kind === 'ssp-auction' && entry.status)) {
    item.format = item.format || formats.get(item.placeId) || CONFIGURED_FORMATS.get(item.placeId) || 'unknown';
    const key = `${item.phase} | ${item.placeId || 'unattributed'} | ${item.format}`;
    const counts = auctions[key] || { requests: 0, noFill: 0, responses: {} };
    counts.requests += 1;
    counts.noFill += Number(item.status === 204);
    counts.responses[item.status] = (counts.responses[item.status] || 0) + 1;
    auctions[key] = counts;
  }
  run.auctionsByPlacement = auctions;
  run.cspFailures = [...new Map(run.states.flatMap((state) => state.csp).map((entry) => [`${entry.directive}:${entry.blocked}`, entry])).values()];
  console.log(`${run.baseUrl} ${run.device}/${run.locale}: ${run.states.map((state) =>
    `${state.label} SDK=${state.sdkLoaded} rendered=${state.slots.filter((slot) => slot.actualStatus === 'rendered').length} no-fill=${state.slots.filter((slot) => slot.actualStatus === 'no-fill').length}`).join('; ')}`);
  for (const [placement, result] of Object.entries(auctions)) console.log(`  ${placement}: ${JSON.stringify(result.responses)}`);
  for (const item of run.network.filter((entry) => entry.kind === 'video-preroll' && entry.status)) {
    console.log(`  video ${item.phase}: HTTP ${item.status} ${item.result?.reason || 'unknown'} ${item.result?.error || (item.result?.success ? 'media resolved' : 'no media')}`);
  }
  if (run.cspFailures.length) console.log(`  CSP failures: ${run.cspFailures.length}`);
  delete run.startedAt;
  delete run.phase;
}

async function main() {
  for (const device of DEVICE_NAMES) if (!TARGETS[device]) throw new Error(`Unknown AD_DEBUG_DEVICES entry: ${device}`);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const report = { generatedAt: new Date().toISOString(), waitMs: WAIT_MS, baseUrls: BASE_URLS, runs: [] };
  const browser = await chromium.launch({ headless: process.env.AD_DEBUG_HEADLESS !== 'false' });
  try {
    for (const baseUrl of BASE_URLS) for (const device of DEVICE_NAMES) for (const locale of LOCALES) {
      const run = {
        id: `${new URL(baseUrl).hostname.replace(/\./g, '-')}-${device}-${locale}`,
        baseUrl, device, locale, startedAt: Date.now(), phase: 'home',
        states: [], network: [], console: [], errors: [],
      };
      report.runs.push(run);
      let context;
      try {
        context = await prepareContext(browser, TARGETS[device], true);
        const page = await context.newPage();
        const flush = attachNetwork(page, run);
        await page.goto(`${baseUrl}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        const articlePath = await firstArticlePath(page, locale);
        run.articlePath = articlePath;
        run.phase = 'direct-accepted';
        await page.goto(new URL(articlePath, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(WAIT_MS);
        await snapshot(page, run, run.phase);
        run.phase = 'home-before-spa';
        await page.goto(`${baseUrl}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.locator(`a[href="${articlePath}"]`).first().waitFor();
        const spaArticlePath = await page.locator(`a[href*="/${locale}/article/"]`).evaluateAll((links, directPath) =>
          links.map((link) => new URL(link.href).pathname).find((article) => article !== directPath) || directPath, articlePath);
        run.spaArticlePath = spaArticlePath;
        // Hydration finishes before this click, preserving a real client-side navigation.
        await page.waitForTimeout(1200);
        run.phase = 'spa-accepted';
        await page.locator(`a[href="${spaArticlePath}"]`).first().click();
        await page.waitForURL((url) => url.pathname === spaArticlePath, { timeout: 20000 });
        await page.waitForTimeout(WAIT_MS);
        await snapshot(page, run, run.phase);
        run.phase = 'opening-consent-settings';
        const settings = page.getByRole('button', { name: /Cookie Settings|Ustawienia plików cookie/ }).first();
        if (await settings.count()) {
          await settings.click();
          await page.getByRole('button', { name: /^(Reject All|Odrzuć wszystko)$/ }).click();
          run.phase = 'revoked';
          run.revokedAtMs = Date.now() - run.startedAt;
          await page.waitForTimeout(1500);
          await snapshot(page, run, run.phase);
        } else {
          run.errors.push({ phase: run.phase, text: 'Cookie Settings control missing; revocation could not be exercised via UI' });
        }
        await flush();
        await context.close();
        context = await prepareContext(browser, TARGETS[device], false);
        const rejectedPage = await context.newPage();
        const flushRejected = attachNetwork(rejectedPage, run);
        run.phase = 'direct-rejected';
        await rejectedPage.goto(new URL(articlePath, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await rejectedPage.waitForTimeout(WAIT_MS);
        await snapshot(rejectedPage, run, run.phase);
        await flushRejected();
      } catch (error) {
        run.errors.push({ phase: run.phase, text: safeText(error.message) });
      } finally {
        if (context) await context.close();
        summarize(run);
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
      }
    }
  } finally { await browser.close(); }
  console.log(`Saved report: ${OUTPUT_PATH}`);
  if (report.runs.some((run) => run.errors.length)) process.exitCode = 1;
}

main().catch((error) => { console.error('Live ad debug failed:', safeText(error.message)); process.exitCode = 1; });
