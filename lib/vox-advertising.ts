/**
 * VOX ADVERTISING — Clean rebuild
 * 
 * Простая интеграция VOX SSP:
 * 1. In-Image реклама (поверх изображений в статьях)
 * 2. Display баннеры (фиксированные размеры)
 * 
 * PlaceID из документации ADVERTISING_CODES_GUIDE.md
 */

// ========== PLACE IDs ==========

/** In-Image — поверх изображений в статьях */
export const VOX_IN_IMAGE_PLACE_ID = "63d93bb54d506e95f039e2e3";

/** Display форматы */
export const VOX_PLACES = {
  // Desktop
  LEADERBOARD:      "63da9b577bc72f39bc3bfc68",  // 728x90
  MEDIUM_RECTANGLE: "63da9e2a4d506e16acfd2a36",  // 300x250
  LARGE_LEADERBOARD:"63daa3c24d506e16acfd2a38",  // 970x250
  LARGE_SKYSCRAPER: "63daa2ea7bc72f39bc3bfc72",  // 300x600
  // Mobile
  MOBILE_BANNER:    "68f644dc70e7b26b58596f34",  // 320x50
  MOBILE_WIDE_SKY:  "68f6451d810d98e1a08f2725",  // 160x600
  MOBILE_LARGE:     "68f645bf810d98e1a08f272f",  // 320x100
  // Display
  MOBILE_INTERSTITIAL: "68f63437810d98e1a08f26de", // 320x480
} as const;

/** Video форматы */
export const VOX_VIDEO_PLACES = {
  INSTREAM_ARTICLE_END: "68f70a1c810d98e1a08f2740",
  INSTREAM_ARTICLE_MIDDLE: "68f70a1c810d98e1a08f2741",
  OUTSTREAM_SIDEBAR: "68f70a1c810d98e1a08f2742",
  OUTSTREAM_MOBILE: "68f70a1c810d98e1a08f2743",
} as const;

// ========== VOX SCRIPT ==========
// Чистый скрипт, скопированный из рабочей версии (worktree/nmp)
// с минимальными правками

export const VOX_SCRIPT = `
// ===== VOX SSP — icoffio =====

function hasAdvertisingConsent() {
  try {
    var saved = localStorage.getItem('icoffio_cookie_consent');
    if (!saved) return false;
    var parsed = JSON.parse(saved);
    return parsed.hasConsented && parsed.preferences && parsed.preferences.advertising;
  } catch (e) {
    return false;
  }
}

function loadVOXScript() {
  if (!hasAdvertisingConsent()) {
    return;
  }
  if (!document.querySelector('script[data-vox-ssp="1"]')) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://st.hbrd.io/ssp.js";
    script.setAttribute('fetchpriority', 'high');
    script.setAttribute('data-vox-ssp', '1');
    (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(script);
  }
  window._tx = window._tx || {};
  window._tx.cmds = window._tx.cmds || [];
}

var _voxUrl = '';
var _voxRetryTimers = [];
var _voxObserver = null;
var _voxUrlIntervalStarted = false;
var _voxUrlIntervalId = null;
var _voxInitializing = false;
var _voxMutationDebounce = null;
var _voxTotalInits = 0;
var _voxMaxInits = 15;
var _voxInImageDone = false;

var VOX_ALLOWED_DISPLAY_IDS = {
  "${VOX_PLACES.LEADERBOARD}": true,
  "${VOX_PLACES.MEDIUM_RECTANGLE}": true,
  "${VOX_PLACES.LARGE_LEADERBOARD}": true,
  "${VOX_PLACES.LARGE_SKYSCRAPER}": true,
  "${VOX_PLACES.MOBILE_BANNER}": true,
  "${VOX_PLACES.MOBILE_WIDE_SKY}": true,
  "${VOX_PLACES.MOBILE_LARGE}": true,
  "${VOX_PLACES.MOBILE_INTERSTITIAL}": true,
  "${VOX_VIDEO_PLACES.INSTREAM_ARTICLE_END}": true,
  "${VOX_VIDEO_PLACES.INSTREAM_ARTICLE_MIDDLE}": true,
  "${VOX_VIDEO_PLACES.OUTSTREAM_SIDEBAR}": true,
  "${VOX_VIDEO_PLACES.OUTSTREAM_MOBILE}": true
};

function clearRetryTimers() {
  _voxRetryTimers.forEach(function(timerId) {
    clearTimeout(timerId);
  });
  _voxRetryTimers = [];
}

function containerHasContent(container) {
  return (
    container.children.length > 0 ||
    container.querySelector('iframe') !== null ||
    (container.innerHTML && container.innerHTML.trim() !== '')
  );
}

function initVOX(reason) {
  if (!hasAdvertisingConsent()) return;
  if (typeof window._tx === 'undefined' || !window._tx.integrateInImage || !window._tx.init) return;
  if (_voxInitializing) return;
  if (_voxTotalInits >= _voxMaxInits) return;

  _voxInitializing = true;
  _voxTotalInits++;

  try {
    var isArticle = window.location.pathname.indexOf('/article/') !== -1;

    // Only call integrateInImage once per page to avoid re-injecting ads
    if (isArticle && !_voxInImageDone) {
      _voxInImageDone = true;
      window._tx.integrateInImage({
        placeId: "${VOX_IN_IMAGE_PLACE_ID}",
        fetchSelector: true,
        excludeSelectors: [
          '[data-no-inimage] img',
          '[data-related-articles] img',
          '[data-article-card] img',
          'a[href*="/article/"] img',
          '.group img',
          '[class*="aspect-"] img',
          'nav img',
          'header img',
          'footer img'
        ].join(', ')
      });
    }

    var containers = document.querySelectorAll('[data-hyb-ssp-ad-place]');
    var displayCount = 0;

    containers.forEach(function(el) {
      var placeId = el.getAttribute('data-hyb-ssp-ad-place');
      if (!placeId || !VOX_ALLOWED_DISPLAY_IDS[placeId]) return;
      if (el.getAttribute('data-ad-status') === 'unsuitable') return;

      var computed = window.getComputedStyle(el);
      if (computed.display === 'none' || computed.visibility === 'hidden') return;
      if (containerHasContent(el)) return;

      var attempts = parseInt(el.getAttribute('data-vox-init-attempts') || '0', 10);
      if (attempts >= 3) return;
      el.setAttribute('data-vox-init-attempts', String(attempts + 1));

      window._tx.integrateInImage({
        placeId: placeId,
        setDisplayBlock: true
      });
      displayCount++;
    });

    // Only call _tx.init() if we actually added new placements
    var needsInit = displayCount > 0 || (isArticle && _voxTotalInits <= 1);
    if (needsInit) {
      window._tx.init();
      console.log('[VOX] init (' + (reason || 'default') + ') inImage=' + isArticle + ' display=' + displayCount);
    }
  } catch (err) {
    console.error('VOX error:', err);
  } finally {
    _voxInitializing = false;
  }
}

function scheduleRetries(reason) {
  clearRetryTimers();
  // Only 2 retries with longer delays to reduce flickering
  [500, 2500].forEach(function(delay) {
    var timer = setTimeout(function() {
      initVOX(reason + ':' + delay + 'ms');
    }, delay);
    _voxRetryTimers.push(timer);
  });
}

function checkUrlAndReinit() {
  if (window.location.href !== _voxUrl) {
    _voxUrl = window.location.href;
    _voxTotalInits = 0; // Reset init counter on route change
    _voxInImageDone = false; // Reset in-image flag for new page
    scheduleRetries('route-change');
  }
}

function ensureDomObserver() {
  if (_voxObserver) return;

  _voxObserver = new MutationObserver(function(mutations) {
    var hasNewAdContainer = mutations.some(function(mutation) {
      if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
        return false;
      }

      return Array.from(mutation.addedNodes).some(function(node) {
        if (!(node instanceof HTMLElement)) return false;
        if (node.matches('[data-hyb-ssp-ad-place]')) return true;
        return node.querySelector('[data-hyb-ssp-ad-place]') !== null;
      });
    });

    if (hasNewAdContainer) {
      if (_voxMutationDebounce) clearTimeout(_voxMutationDebounce);
      _voxMutationDebounce = setTimeout(function() {
        scheduleRetries('dom-mutation');
      }, 500);
    }
  });

  _voxObserver.observe(document.body, { childList: true, subtree: true });
}

function startUrlTracking() {
  if (_voxUrlIntervalStarted) return;
  _voxUrlIntervalStarted = true;
  _voxUrl = window.location.href;
  // Use recursive setTimeout instead of setInterval to prevent overlap
  // and allow garbage collection on page unload
  function tick() {
    checkUrlAndReinit();
    _voxUrlIntervalId = setTimeout(tick, 2000);
  }
  _voxUrlIntervalId = setTimeout(tick, 2000);
}

function bootstrapVOX() {
  if (!hasAdvertisingConsent()) return;
  scheduleRetries('bootstrap');
  ensureDomObserver();
  startUrlTracking();
}

function onSdkReady(callback) {
  if (window._tx && window._tx.integrateInImage) {
    callback();
    return;
  }

  window._tx = window._tx || {};
  window._tx.cmds = window._tx.cmds || [];
  window._tx.cmds.push(callback);
}

function startVOX() {
  if (!hasAdvertisingConsent()) return;
  loadVOXScript();
  onSdkReady(function() {
    if (document.readyState === 'complete') {
      bootstrapVOX();
      return;
    }
    window.addEventListener('load', bootstrapVOX, { once: true });
    setTimeout(bootstrapVOX, 1400);
  });
}

startVOX();

window.addEventListener('cookieConsentChanged', function(e) {
  if (e.detail && e.detail.advertising) {
    startVOX();
  }
});
`;
