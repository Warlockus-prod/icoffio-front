/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const BASE_URL = process.env.AD_DEBUG_BASE_URL || 'https://app.icoffio.com';
const OUTPUT_PATH = process.env.AD_DEBUG_OUTPUT ||
  path.join(process.cwd(), '.playwright-mcp', 'live-ad-debug-report.json');

const TARGETS = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  { name: 'tablet', context: { ...devices['iPad Pro 11'] } },
  { name: 'mobile', context: { ...devices['iPhone 12'] } },
];

const LOCALES = ['en', 'pl'];

function makeConsent() {
  const now = Date.now();
  return {
    hasConsented: true,
    timestamp: now,
    preferences: {
      necessary: true,
      analytics: true,
      advertising: true,
    },
    version: '1.0',
    expiryDate: now + 365 * 24 * 60 * 60 * 1000,
  };
}

async function findFirstArticlePath(page, locale) {
  const href = await page.evaluate((loc) => {
    const link = document.querySelector(`a[href*="/${loc}/article/"]`);
    return link ? link.getAttribute('href') : null;
  }, locale);

  if (!href) return `/${locale}/article/ai-revolution-2024-en`;
  return href.startsWith('http') ? new URL(href).pathname : href;
}

async function collectAdDetails(page) {
  return page.evaluate(() => {
    const toSize = (element) => {
      if (!element) return { width: 0, height: 0 };

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const parse = (v) => {
        const n = Number.parseFloat((v || '').toString().replace('px', ''));
        return Number.isFinite(n) ? n : 0;
      };

      return {
        width: Math.round(Math.max(rect.width, parse(style.width), element.clientWidth || 0, parse(element.getAttribute?.('width')))),
        height: Math.round(Math.max(rect.height, parse(style.height), element.clientHeight || 0, parse(element.getAttribute?.('height')))),
      };
    };

    const visible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    return Array.from(document.querySelectorAll('[data-hyb-ssp-ad-place]')).map((container) => {
      const iframe = container.querySelector('iframe');
      const creative = iframe || container.firstElementChild;

      return {
        placeId: container.getAttribute('data-hyb-ssp-ad-place') || '',
        adStatus: container.getAttribute('data-ad-status') || '',
        placement: container.getAttribute('data-ad-placement') || '',
        format: container.getAttribute('data-ad-format') || '',
        visible: visible(container),
        inAside: Boolean(container.closest('aside')),
        containerSize: toSize(container),
        creativeSize: toSize(creative),
        hasIframe: Boolean(iframe),
      };
    });
  });
}

function printRun(run) {
  console.log(`\n=== ${run.device} / ${run.locale} ===`);
  console.log(`URL: ${run.articleUrl}`);
  console.log('placeId | status | placement | format | visible | container | creative');
  run.ads.forEach((ad) => {
    const c = `${ad.containerSize.width}x${ad.containerSize.height}`;
    const cr = `${ad.creativeSize.width}x${ad.creativeSize.height}`;
    console.log(
      `${ad.placeId} | ${ad.adStatus || '-'} | ${ad.placement || '-'} | ${ad.format || '-'} | ${ad.visible} | ${c} | ${cr}`
    );
  });
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    runs: [],
  };

  const browser = await chromium.launch({ headless: true });

  try {
    for (const target of TARGETS) {
      const context = await browser.newContext(target.context);
      await context.addInitScript((consent) => {
        localStorage.setItem('icoffio_cookie_consent', JSON.stringify(consent));
      }, makeConsent());

      const page = await context.newPage();

      for (const locale of LOCALES) {
        await page.goto(`${BASE_URL}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3500);

        const articlePath = await findFirstArticlePath(page, locale);
        const articleUrl = `${BASE_URL}${articlePath}`;
        await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(6500);

        const ads = await collectAdDetails(page);
        const run = { device: target.name, locale, articleUrl, ads };
        report.runs.push(run);
        printRun(run);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nSaved JSON report: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('Live ad debug failed:', error);
  process.exit(1);
});
