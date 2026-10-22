import { CONSENT_KEY, hasAdvertisingConsent, VOX_SDK_URL } from './consent-storage';

const IN_IMAGE_PLACE_ID = '63d93bb54d506e95f039e2e3';
const ARTICLE_IMAGE_SELECTOR = 'main article img[data-article-image], main article .prose img';
const EXCLUDED_IMAGE_ANCESTORS = [
  '[data-no-inimage]', '[data-related-articles]', '[data-article-card]',
  '[data-hyb-ssp-ad-place]', '[data-hyb-ssp-in-image-overlay]',
  'nav', 'header', 'footer', 'aside',
].join(', ');

interface VoxSdk {
  cmds: Array<() => void>;
  integrateInImage?: (options: {
    placeId: string;
    imageSelector: string;
    image: HTMLImageElement;
  }) => void | Promise<unknown>;
  init?: () => void;
}

// Route effects/Strict Mode can run repeatedly for the same DOM. New articles
// supply new image nodes; each is registered once with the current SDK.
const registeredImages = new WeakMap<VoxSdk, WeakSet<HTMLImageElement>>();

interface VoxLifecycleOptions {
  window: Window & typeof globalThis;
  document: Document;
  pathname: string;
  displayPlaceIds: ReadonlySet<string>;
  onError?: (error: unknown) => void;
}

/** Own the SDK queue, late placements and listeners for one consented route. */
export function startVoxAdLifecycle({
  window: win,
  document: doc,
  pathname,
  displayPlaceIds,
  onError = (error) => console.error('VOX init error:', error),
}: VoxLifecycleOptions): () => void {
  let active = true;
  let debounce: number | undefined;
  const timers = new Set<number>();
  const isArticle = pathname.includes('/article/');
  const hasConsent = () => {
    try {
      return active && hasAdvertisingConsent(win.localStorage.getItem(CONSENT_KEY));
    } catch {
      return false;
    }
  };
  const isArticleImage = (image: HTMLImageElement) => (
    isArticle && image.matches(ARTICLE_IMAGE_SELECTOR) &&
    !image.closest(EXCLUDED_IMAGE_ANCESTORS) &&
    !(image.complete && image.naturalWidth === 0)
  );

  const init = () => {
    if (!hasConsent()) return;
    const sdk = win._tx as VoxSdk | undefined;
    if (!sdk?.integrateInImage || !sdk.init) return;
    let images = registeredImages.get(sdk);
    if (!images) {
      images = new WeakSet<HTMLImageElement>();
      registeredImages.set(sdk, images);
    }
    let addedImage = false;
    try {
      if (isArticle) {
        doc.querySelectorAll<HTMLImageElement>(ARTICLE_IMAGE_SELECTOR).forEach((image) => {
          if (!isArticleImage(image) || images.has(image)) return;
          images.add(image);
          try {
            // Actual VOX API: image + imageSelector. The actual image prevents
            // remote broad selectors from selecting cards or ad creatives.
            // SDK size checks/ResizeObservers still decide eligibility.
            const result = sdk.integrateInImage!({
              placeId: IN_IMAGE_PLACE_ID,
              imageSelector: ARTICLE_IMAGE_SELECTOR,
              image,
            });
            addedImage = true;
            Promise.resolve(result).catch((error) => {
              images.delete(image);
              if (active) onError(error);
            });
          } catch (error) {
            images.delete(image);
            onError(error);
          }
        });
      }
      const hasDisplay = Array.from(
        doc.querySelectorAll<HTMLElement>('[data-hyb-ssp-ad-place]')
      ).some((container) => (
        displayPlaceIds.has(container.dataset.hybSspAdPlace || '') &&
        container.dataset.adStatus !== 'unsuitable' &&
        !container.dataset.hybSspAdPlaceStatus &&
        container.getClientRects().length > 0
      ));
      // init() scans display containers itself. In-image constructors call
      // initOverlay() once their asynchronous SDK module has loaded.
      if (addedImage || hasDisplay) sdk.init();
    } catch (error) {
      onError(error);
    }
  };

  const schedule = () => {
    if (!hasConsent()) return;
    if (debounce !== undefined) win.clearTimeout(debounce);
    debounce = win.setTimeout(init, 100);
  };
  const retry = () => {
    init();
    timers.forEach((timer) => win.clearTimeout(timer));
    timers.clear();
    [500, 2500].forEach((delay) => {
      const timer = win.setTimeout(() => {
        timers.delete(timer);
        init();
      }, delay);
      timers.add(timer);
    });
  };

  // Install BEFORE loading the SDK. A ref flipped by script.onload does not
  // rerun a React effect, which lost this observer after the first consent.
  const observer = new win.MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => {
      if (!(node instanceof win.HTMLElement)) return false;
      if (node.matches('[data-hyb-ssp-ad-place]') || node.querySelector('[data-hyb-ssp-ad-place]')) return true;
      if (node instanceof win.HTMLImageElement && isArticleImage(node)) return true;
      return Array.from(node.querySelectorAll<HTMLImageElement>(ARTICLE_IMAGE_SELECTOR)).some(isArticleImage);
    }));
    if (relevant) schedule();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  const onLoad = (event: Event) => {
    if (event.target instanceof win.HTMLImageElement && isArticleImage(event.target)) schedule();
  };
  doc.addEventListener('load', onLoad, true);
  win.addEventListener('resize', schedule);

  if (!win._tx || typeof win._tx !== 'object') win._tx = {};
  const sdk = win._tx as VoxSdk;
  if (!Array.isArray(sdk.cmds)) sdk.cmds = [];
  let readyHandled = false;
  const onReady = () => {
    if (readyHandled || !hasConsent()) return;
    if (!win._tx?.integrateInImage || !win._tx.init) return;
    readyHandled = true;
    retry();
  };
  let script = doc.querySelector<HTMLScriptElement>('script[data-vox-ssp="1"]');
  const onScriptError = () => {
    script?.remove();
    if (active) onError(new Error('VOX script failed to load'));
  };
  if (hasConsent()) {
    if (sdk.integrateInImage && sdk.init) {
      onReady();
    } else {
      sdk.cmds.push(onReady);
      if (!script) {
        script = doc.createElement('script');
        script.async = true;
        script.src = VOX_SDK_URL;
        script.dataset.voxSsp = '1';
        script.addEventListener('load', onReady);
        script.addEventListener('error', onScriptError);
        doc.head.appendChild(script);
      } else {
        script.addEventListener('load', onReady);
        script.addEventListener('error', onScriptError);
      }
    }
  }

  return () => {
    active = false;
    observer.disconnect();
    if (debounce !== undefined) win.clearTimeout(debounce);
    timers.forEach((timer) => win.clearTimeout(timer));
    doc.removeEventListener('load', onLoad, true);
    win.removeEventListener('resize', schedule);
    script?.removeEventListener('load', onReady);
    script?.removeEventListener('error', onScriptError);
    // A callback requested on an old route must not start ads after navigation
    // or consent revocation, even if the third-party SDK loads much later.
    const index = sdk.cmds.indexOf(onReady);
    if (index !== -1) sdk.cmds.splice(index, 1);
  };
}
