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
    console.log('VOX: waiting for consent');
    return;
  }
  if (typeof window._tx === "undefined") {
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = "https://st.hbrd.io/ssp.js";
    s.setAttribute('fetchpriority', 'high');
    (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(s);
  }
  window._tx = window._tx || {};
  window._tx.cmds = window._tx.cmds || [];
}

function initVOX() {
  if (!hasAdvertisingConsent()) return;
  if (typeof window._tx === 'undefined' || !window._tx.integrateInImage) return;

  try {
    // 1) In-Image — ТОЛЬКО на страницах статей
    var isArticle = window.location.pathname.includes('/article/');
    if (isArticle) {
      window._tx.integrateInImage({
        placeId: "${VOX_IN_IMAGE_PLACE_ID}",
        fetchSelector: true,
        excludeSelectors: [
          '.group img',
          '[class*="aspect-"] img',
          'nav img', 'header img', 'footer img',
          'a[href*="/article/"] img:not(.prose img):not(article > div > img)'
        ].join(', ')
      });
      console.log('VOX: In-Image init');
    }

    // 2) Display баннеры — находим все контейнеры на странице
    var containers = document.querySelectorAll('[data-hyb-ssp-ad-place]');
    var count = 0;
    containers.forEach(function(el) {
      window._tx.integrateInImage({
        placeId: el.getAttribute('data-hyb-ssp-ad-place'),
        setDisplayBlock: true
      });
      count++;
    });
    console.log('VOX: ' + count + ' display containers');

    // 3) Запуск bid requests
    if (count > 0 || isArticle) {
      window._tx.init();
      console.log('VOX: init() — bid requests sent');
    }
  } catch (err) {
    console.error('VOX error:', err);
  }
}

// URL tracking для SPA навигации Next.js
var _voxUrl = '';
function checkUrl() {
  if (window.location.href !== _voxUrl) {
    _voxUrl = window.location.href;
    setTimeout(initVOX, 500);
  }
}

function startVOX() {
  if (!hasAdvertisingConsent()) return;
  loadVOXScript();
  window._tx.cmds.push(function() {
    function firstInit() {
      _voxUrl = window.location.href;
      initVOX();
      setInterval(checkUrl, 1500);
    }
    if (document.readyState === 'complete') {
      firstInit();
    } else {
      window.addEventListener('load', firstInit);
      setTimeout(firstInit, 2000);
    }
  });
}

startVOX();

window.addEventListener('cookieConsentChanged', function(e) {
  if (e.detail && e.detail.advertising) startVOX();
});
`;
