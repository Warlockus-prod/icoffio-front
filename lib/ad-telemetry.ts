/**
 * Client side of ad accounting: reports each VOX place's auction outcome once.
 *
 * The VOX SDK stamps `data-hyb-ssp-ad-place-status` on display containers and
 * in-image wrappers: `display` once a creative is written, `empty` on no-fill.
 * We watch that attribute and send each outcome once per container to
 * /api/ads/telemetry, batched. Started by AdManager only after advertising consent.
 */

const ENDPOINT = '/api/ads/telemetry';
const FLUSH_DELAY_MS = 3000;
/** Tailwind `xl` — the breakpoint that switches the article between mobile and desktop slots. */
const DESKTOP_MIN_WIDTH = 1280;

export interface AdTelemetryEvent {
  placeId: string;
  format: string;
  outcome: 'filled' | 'empty';
}

/** Outcome for a VOX status value; intermediate states (init, ready…) are not counted. */
export function outcomeFromVoxStatus(status: string | null): AdTelemetryEvent['outcome'] | null {
  if (status === 'display') return 'filled';
  if (status === 'empty') return 'empty';
  return null;
}

export function describeAdElement(el: Element): Omit<AdTelemetryEvent, 'outcome'> | null {
  const display = el.getAttribute('data-hyb-ssp-ad-place');
  if (display) return { placeId: display, format: el.getAttribute('data-ad-format') || 'display' };
  const inImage = el.getAttribute('data-hyb-ssp-in-image-overlay');
  if (inImage) return { placeId: inImage, format: 'in-image' };
  return null;
}

export function startAdTelemetry(win: Window & typeof globalThis, doc: Document): () => void {
  const reported = new WeakMap<Element, AdTelemetryEvent['outcome']>();
  let queue: AdTelemetryEvent[] = [];
  let timer: number | undefined;

  const flush = () => {
    if (timer !== undefined) win.clearTimeout(timer);
    timer = undefined;
    if (!queue.length) return;
    const payload = JSON.stringify({
      device: win.innerWidth >= DESKTOP_MIN_WIDTH ? 'desktop' : 'mobile',
      events: queue,
    });
    queue = [];
    try {
      if (!win.navigator.sendBeacon?.(ENDPOINT, payload)) {
        win.fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
      }
    } catch {
      // Accounting must never break the page.
    }
  };

  const consider = (el: Element) => {
    const outcome = outcomeFromVoxStatus(el.getAttribute('data-hyb-ssp-ad-place-status'));
    const info = outcome && describeAdElement(el);
    if (!outcome || !info) return;
    // VOX statuses are terminal: count the first outcome per container only.
    if (reported.has(el)) return;
    reported.set(el, outcome);
    queue.push({ ...info, outcome });
    if (timer === undefined) timer = win.setTimeout(flush, FLUSH_DELAY_MS);
  };

  const observer = new win.MutationObserver((mutations) => {
    for (const m of mutations) if (m.target instanceof win.Element) consider(m.target);
  });
  observer.observe(doc.body, { attributes: true, subtree: true, attributeFilter: ['data-hyb-ssp-ad-place-status'] });

  const onHide = () => flush();
  win.addEventListener('pagehide', onHide);

  return () => {
    observer.disconnect();
    win.removeEventListener('pagehide', onHide);
    flush();
  };
}
