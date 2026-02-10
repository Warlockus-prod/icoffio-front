/**
 * 📺 VOX ADVERTISING INTEGRATION - icoffio v7.30.0
 * 
 * Centralized VOX ad script configuration
 * Provides CSS styles and initialization scripts for display/video ads
 */

// ========== VOX AD PLACEMENTS ==========

export const VOX_DISPLAY_PLACEMENTS = [
  // Desktop formats (stable)
  { id: "63da9b577bc72f39bc3bfc68", format: "728x90", type: "desktop" },
  { id: "63da9e2a4d506e16acfd2a36", format: "300x250", type: "desktop" },
  { id: "63daa3c24d506e16acfd2a38", format: "970x250", type: "desktop" },
  { id: "63daa2ea7bc72f39bc3bfc72", format: "300x600", type: "desktop" },
  // Mobile formats
  { id: "68f644dc70e7b26b58596f34", format: "320x50", type: "mobile" },
  { id: "68f6451d810d98e1a08f2725", format: "160x600", type: "mobile" },
  { id: "68f645bf810d98e1a08f272f", format: "320x100", type: "mobile" },
  // Display formats
  { id: "68f63437810d98e1a08f26de", format: "320x480", type: "display" },
] as const;

export const VOX_IN_IMAGE_PLACE_ID = "63d93bb54d506e95f039e2e3";

// ========== VOX INLINE CSS ==========

export const VOX_INLINE_CSS = `
/* VOX контейнеры — позиционирование */
.vox-ad-container {
  position: relative;
  display: block;
  background: transparent;
  border: none;
}

/* Контейнеры для статьи - адаптивные */
article [data-hyb-ssp-ad-place] {
  overflow: visible !important;
}

/* Desktop широкие баннеры - фиксированные размеры */
[data-hyb-ssp-ad-place="63da9b577bc72f39bc3bfc68"] iframe,
[data-hyb-ssp-ad-place="63da9b577bc72f39bc3bfc68"] > div {
  width: 728px !important;
  height: 90px !important;
  max-width: none !important;
}

[data-hyb-ssp-ad-place="63daa3c24d506e16acfd2a38"] iframe,
[data-hyb-ssp-ad-place="63daa3c24d506e16acfd2a38"] > div {
  width: 970px !important;
  height: 250px !important;
  max-width: none !important;
}

/* Sidebar баннеры - фиксированные размеры */
aside [data-hyb-ssp-ad-place="63da9e2a4d506e16acfd2a36"] {
  width: 300px !important;
}

aside [data-hyb-ssp-ad-place="63daa2ea7bc72f39bc3bfc72"] {
  width: 300px !important;
}

/* Mobile форматы */
[data-hyb-ssp-ad-place="68f644dc70e7b26b58596f34"] {
  max-width: 320px !important;
}

[data-hyb-ssp-ad-place="68f6451d810d98e1a08f2725"] {
  max-width: 160px !important;
}

[data-hyb-ssp-ad-place="68f645bf810d98e1a08f272f"] {
  max-width: 320px !important;
}

/* Display форматы */
[data-hyb-ssp-ad-place="68f63437810d98e1a08f26de"] {
  max-width: 320px !important;
}

/* Никаких минимальных высот - VOX сам определит размер */
/* Если реклама не загружена - места не занимает */
`;

// ========== VOX INITIALIZATION SCRIPT ==========

export const VOX_INIT_SCRIPT = `
// ============ VOX ADVERTISING INTEGRATION - v7.30.0 ============

// Функция проверки cookie consent для advertising
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

// Загружаем VOX скрипт только если есть согласие
function loadVOXScript() {
  if (!hasAdvertisingConsent()) {
    console.log('VOX: Ожидание согласия пользователя на рекламу');
    return;
  }
  
  console.log('VOX: Загрузка скрипта с согласием пользователя');
  
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

// Display placements configuration
var VOX_DISPLAY_PLACEMENTS = ${JSON.stringify(VOX_DISPLAY_PLACEMENTS)};
var VOX_IN_IMAGE_PLACE_ID = "${VOX_IN_IMAGE_PLACE_ID}";

// Функция инициализации VOX с поддержкой переинициализации
function initVOX() {
  if (!hasAdvertisingConsent()) {
    console.log('VOX: Пропуск инициализации - нет согласия на рекламу');
    return;
  }
  
  console.log('VOX: Инициализация начата для URL:', window.location.href);
  
  if (typeof window._tx === 'undefined' || !window._tx.integrateInImage) {
    console.log('VOX: API не готов, пропуск инициализации');
    return;
  }
  
  try {
    // 1. In-Image реклама (ТОЛЬКО для страниц статей)
    var isArticlePage = window.location.pathname.includes('/article/');
    
    if (isArticlePage) {
      window._tx.integrateInImage({
        placeId: VOX_IN_IMAGE_PLACE_ID,
        fetchSelector: true,
        excludeSelectors: [
          '.group img',
          '[class*="aspect-"] img',
          'nav img',
          'header img',
          'footer img',
          'a[href*="/article/"] img:not(.prose img):not(article > div > img)'
        ].join(', ')
      });
      console.log('VOX: In-Image инициализирована (только для статьи)');
    } else {
      console.log('VOX: In-Image пропущена - не страница статьи');
    }
    
    // 2. Display форматы
    var displayCount = 0;
    VOX_DISPLAY_PLACEMENTS.forEach(function(placement) {
      var container = document.querySelector('[data-hyb-ssp-ad-place="' + placement.id + '"]');
      if (container) {
        window._tx.integrateInImage({
          placeId: placement.id,
          setDisplayBlock: true
        });
        console.log('VOX: Display format ' + placement.format + ' восстановлен правильно');
        displayCount++;
      }
    });
    
    console.log('VOX: Найдено ' + displayCount + ' display контейнеров');
    
    // 3. Система показа контейнеров после загрузки рекламы
    setupAdVisibilityWatcher();
    
    // 4. КРИТИЧНО: window._tx.init() запускает bid requests к DSP!
    // Без этого вызова VOX регистрирует плейсменты но НЕ запрашивает рекламу
    var totalContainers = document.querySelectorAll('[data-hyb-ssp-ad-place]').length;
    if (totalContainers > 0 || isArticlePage) {
      window._tx.init();
      console.log('VOX: init() вызван — bid requests отправлены для ' + totalContainers + ' контейнеров');
    }
    
  } catch (err) {
    console.error('VOX: Ошибка инициализации:', err);
  }
}

// Показать рекламный контейнер (сбросить все скрывающие стили)
function showAdContainer(container) {
  container.style.opacity = '1';
  container.style.maxHeight = 'none';
  container.style.overflow = 'visible';
  container.style.margin = '';
  container.style.padding = '';
  console.log('VOX: Контейнер показан — ' + container.getAttribute('data-ad-format'));
}

// Система показа контейнеров после загрузки рекламы
function setupAdVisibilityWatcher() {
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        var target = mutation.target;
        if (target.hasAttribute && target.hasAttribute('data-hyb-ssp-ad-place')) {
          showAdContainer(target);
        }
      }
    });
  });
  
  // Наблюдаем за всеми ad контейнерами
  document.querySelectorAll('[data-hyb-ssp-ad-place]').forEach(function(container) {
    observer.observe(container, { childList: true, subtree: true });
  });
  
  // Fallback — показываем контейнеры через 3 секунды если что-то загрузилось
  setTimeout(function() {
    document.querySelectorAll('[data-hyb-ssp-ad-place]').forEach(function(container) {
      if (container.children.length > 0 || container.innerHTML.trim() !== '') {
        showAdContainer(container);
      }
    });
  }, 3000);
}

// Функция переинициализации для Next.js client-side navigation
var lastUrl = window.location.href;
function checkAndReinitVOX() {
  var currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    
    // Переинициализация только при переходе НА страницу статьи или С страницы статьи
    var wasArticle = lastUrl.includes('/article/');
    var isArticle = currentUrl.includes('/article/');
    
    if (wasArticle !== isArticle || isArticle) {
      console.log('VOX: URL изменился, переинициализация...');
      setTimeout(function() {
        initVOX();
      }, 500);
    }
  }
}

// ========== ЗАПУСК VOX ==========

function startVOX() {
  if (!hasAdvertisingConsent()) {
    console.log('VOX: Ожидание согласия пользователя');
    return;
  }
  
  loadVOXScript();
  
  // _tx.cmds.push() гарантирует что SDK загружен и готов
  window._tx.cmds.push(function() {
    console.log('VOX: SDK готов, запуск инициализации');
    
    function firstInit() {
      lastUrl = window.location.href;
      initVOX();
      // Мониторинг URL для Next.js SPA навигации
      setInterval(checkAndReinitVOX, 1000);
    }
    
    if (document.readyState === 'complete') {
      firstInit();
    } else {
      window.addEventListener('load', firstInit);
      // Fallback если load уже произошёл
      setTimeout(firstInit, 1500);
    }
  });
}

// Запуск при загрузке страницы
startVOX();

// Слушаем изменения cookie consent
window.addEventListener('cookieConsentChanged', function() {
  console.log('VOX: Cookie consent изменился');
  startVOX();
});
`;

// ========== HELPER FUNCTIONS ==========

/**
 * Get VOX CSS for inline style tag
 */
export function getVoxCss(): string {
  return VOX_INLINE_CSS;
}

/**
 * Get VOX initialization script
 */
export function getVoxScript(): string {
  return VOX_INIT_SCRIPT;
}

/**
 * Check if a format is a desktop format
 */
export function isDesktopFormat(formatId: string): boolean {
  return VOX_DISPLAY_PLACEMENTS.some(p => p.id === formatId && p.type === 'desktop');
}

/**
 * Check if a format is a mobile format
 */
export function isMobileFormat(formatId: string): boolean {
  return VOX_DISPLAY_PLACEMENTS.some(p => p.id === formatId && p.type === 'mobile');
}

/**
 * Get format dimensions by ID
 */
export function getFormatById(formatId: string): typeof VOX_DISPLAY_PLACEMENTS[number] | undefined {
  return VOX_DISPLAY_PLACEMENTS.find(p => p.id === formatId);
}

