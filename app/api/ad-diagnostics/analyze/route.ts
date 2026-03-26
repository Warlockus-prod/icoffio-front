import { NextRequest, NextResponse } from 'next/server';
import { saveScanLog } from '@/lib/ad-diagnostics-logs';

interface AdScript {
  src: string;
  size: string;
  type: 'gam' | 'vox' | 'inimage' | 'prebid' | 'adsense' | 'other-ad' | 'analytics' | 'unknown';
  async: boolean;
  defer: boolean;
  position: 'head' | 'body';
  risk: 'low' | 'medium' | 'high';
  note: string;
}

interface AdContainer {
  id: string;
  classes: string;
  dataAttributes: Record<string, string>;
  dimensions: { width: string; height: string } | null;
  type: string;
  inlineStyles: string;
}

interface PolicyIssue {
  severity: 'warning' | 'error' | 'info';
  category: string;
  message: string;
  detail: string;
}

interface AnalysisResult {
  url: string;
  fetchTime: number;
  pageSize: number;
  scripts: AdScript[];
  adContainers: AdContainer[];
  inImageDetection: {
    detected: boolean;
    provider: string | null;
    scriptSrc: string | null;
    configFound: boolean;
    placeIds: string[];
    excludeSelectors: string[];
    integrationMethod: 'direct' | 'gam' | 'unknown';
  };
  policyIssues: PolicyIssue[];
  performance: {
    totalAdScriptSize: string;
    adScriptCount: number;
    thirdPartyDomains: string[];
    hasLazyLoading: boolean;
    usesIntersectionObserver: boolean;
    mutationObserverCount: number;
  };
  rawMetrics: {
    totalScripts: number;
    totalStylesheets: number;
    totalIframes: number;
    htmlSize: number;
    inlineScriptSize: number;
    inlineStyleSize: number;
  };
  googleAdManager: {
    detected: boolean;
    slots: string[];
    networkId: string | null;
    sizeOverrides: string[];
  };
}

const AD_SCRIPT_PATTERNS: Record<string, { type: AdScript['type']; risk: AdScript['risk']; note: string }> = {
  'securepubads.g.doubleclick.net': { type: 'gam', risk: 'low', note: 'Google Ad Manager (GPT)' },
  'pagead2.googlesyndication.com': { type: 'adsense', risk: 'low', note: 'Google AdSense' },
  'googletagservices.com': { type: 'gam', risk: 'low', note: 'Google Publisher Tag' },
  'googletag': { type: 'gam', risk: 'low', note: 'Google Tag reference' },
  'adsbygoogle': { type: 'adsense', risk: 'low', note: 'AdSense container' },
  'st.hbrd.io/ssp.js': { type: 'vox', risk: 'medium', note: 'VOX SSP (Hybrid.ai)' },
  'hbrd.io': { type: 'vox', risk: 'medium', note: 'VOX/Hybrid ad network' },
  'prebid': { type: 'prebid', risk: 'medium', note: 'Prebid.js header bidding' },
  'amazon-adsystem.com': { type: 'other-ad', risk: 'low', note: 'Amazon advertising' },
  'cdn.teads.tv': { type: 'inimage', risk: 'high', note: 'Teads InRead/InImage' },
  'teads': { type: 'inimage', risk: 'high', note: 'Teads ad platform' },
  'seedtag': { type: 'inimage', risk: 'high', note: 'Seedtag contextual InImage' },
  'geoedge': { type: 'other-ad', risk: 'medium', note: 'GeoEdge ad verification' },
  'iasds01.com': { type: 'other-ad', risk: 'medium', note: 'IAS ad verification' },
  'moatads.com': { type: 'other-ad', risk: 'medium', note: 'Moat ad measurement' },
  'doubleverify.com': { type: 'other-ad', risk: 'medium', note: 'DoubleVerify verification' },
  'confiant': { type: 'other-ad', risk: 'medium', note: 'Confiant ad verification' },
  'criteo': { type: 'other-ad', risk: 'medium', note: 'Criteo retargeting' },
  'outbrain': { type: 'other-ad', risk: 'medium', note: 'Outbrain native ads' },
  'taboola': { type: 'other-ad', risk: 'medium', note: 'Taboola native ads' },
  'integrateInImage': { type: 'inimage', risk: 'high', note: 'InImage integration call' },
  'in-image': { type: 'inimage', risk: 'high', note: 'InImage format reference' },
  'inimage': { type: 'inimage', risk: 'high', note: 'InImage format reference' },
  'in_image': { type: 'inimage', risk: 'high', note: 'InImage format reference' },
};

const INIMAGE_PROVIDERS = [
  { name: 'VOX/Hybrid', patterns: ['hbrd.io', 'integrateInImage', '_tx.integrateInImage'] },
  { name: 'Teads', patterns: ['teads.tv', 'teads.com', 'teads-inread'] },
  { name: 'Seedtag', patterns: ['seedtag.com', 's.seedtag.com'] },
  { name: 'GumGum', patterns: ['gumgum.com', 'g2.gumgum.com'] },
  { name: 'Inskin', patterns: ['inskinad.com', 'inskin.com'] },
  { name: 'Sublime', patterns: ['sublimeskinz.com', 'ayads.co'] },
  { name: 'Yieldmo', patterns: ['yieldmo.com'] },
];

function classifyScript(src: string, content: string): Partial<AdScript> {
  const combined = (src + ' ' + content).toLowerCase();
  for (const [pattern, info] of Object.entries(AD_SCRIPT_PATTERNS)) {
    if (combined.includes(pattern.toLowerCase())) {
      return info;
    }
  }
  if (combined.includes('google') || combined.includes('gtag') || combined.includes('analytics')) {
    return { type: 'analytics', risk: 'low', note: 'Analytics/tracking script' };
  }
  return { type: 'unknown', risk: 'low', note: '' };
}

function detectInImage(html: string): AnalysisResult['inImageDetection'] {
  const result: AnalysisResult['inImageDetection'] = {
    detected: false,
    provider: null,
    scriptSrc: null,
    configFound: false,
    placeIds: [],
    excludeSelectors: [],
    integrationMethod: 'unknown',
  };

  for (const provider of INIMAGE_PROVIDERS) {
    for (const pattern of provider.patterns) {
      if (html.includes(pattern)) {
        result.detected = true;
        result.provider = provider.name;
        break;
      }
    }
    if (result.detected) break;
  }

  // VOX/Hybrid InImage detection
  const voxInImageMatch = html.match(/integrateInImage\s*\(\s*['"]([^'"]+)['"]/);
  if (voxInImageMatch) {
    result.detected = true;
    result.provider = result.provider || 'VOX/Hybrid';
    result.placeIds.push(voxInImageMatch[1]);
    result.configFound = true;
    result.integrationMethod = 'direct';
  }

  // GAM InImage detection (delivered through DFP/GAM)
  if (html.includes('googletag') && (html.includes('inimage') || html.includes('in-image') || html.includes('in_image'))) {
    result.detected = true;
    result.integrationMethod = 'gam';
    if (!result.provider) result.provider = 'GAM InImage';
  }

  // Extract PlaceIDs from VOX config
  const placeIdMatches = html.matchAll(/['"]([a-f0-9]{24})['"]/g);
  for (const match of placeIdMatches) {
    if (!result.placeIds.includes(match[1])) {
      result.placeIds.push(match[1]);
    }
  }

  // Extract exclude selectors
  const excludeMatch = html.match(/excludeSelectors?\s*:\s*\[([^\]]+)\]/);
  if (excludeMatch) {
    const selectors = excludeMatch[1].match(/['"]([^'"]+)['"]/g);
    if (selectors) {
      result.excludeSelectors = selectors.map(s => s.replace(/['"]/g, ''));
    }
  }

  // Teads InImage script src
  const teadsMatch = html.match(/src\s*=\s*['"]([^'"]*teads[^'"]*)['"]/i);
  if (teadsMatch) {
    result.scriptSrc = teadsMatch[1];
  }

  // VOX script src
  const voxMatch = html.match(/src\s*=\s*['"]([^'"]*hbrd\.io[^'"]*)['"]/i);
  if (voxMatch) {
    result.scriptSrc = result.scriptSrc || voxMatch[1];
  }

  return result;
}

function detectGAM(html: string): AnalysisResult['googleAdManager'] {
  const result: AnalysisResult['googleAdManager'] = {
    detected: false,
    slots: [],
    networkId: null,
    sizeOverrides: [],
  };

  if (html.includes('googletag') || html.includes('doubleclick.net') || html.includes('googletagservices.com')) {
    result.detected = true;
  }

  // Network ID
  const networkMatch = html.match(/\/(\d{5,12})\//);
  if (networkMatch && html.includes('googletag')) {
    result.networkId = networkMatch[1];
  }

  // Ad slots
  const slotMatches = html.matchAll(/defineSlot\s*\(\s*['"]([^'"]+)['"]/g);
  for (const match of slotMatches) {
    result.slots.push(match[1]);
  }

  // Size overrides
  const sizeMatches = html.matchAll(/addSize\s*\(\s*\[(\d+),\s*(\d+)\]\s*,\s*\[(\d+),\s*(\d+)\]/g);
  for (const match of sizeMatches) {
    result.sizeOverrides.push(`viewport[${match[1]}x${match[2]}] → ad[${match[3]}x${match[4]}]`);
  }

  return result;
}

function findPolicyIssues(html: string, scripts: AdScript[], inImage: AnalysisResult['inImageDetection']): PolicyIssue[] {
  const issues: PolicyIssue[] = [];

  // Check for heavy ad creatives
  const totalAdWeight = scripts
    .filter(s => s.type !== 'analytics' && s.type !== 'unknown')
    .reduce((acc, s) => acc + parseInt(s.size || '0'), 0);

  if (totalAdWeight > 1000000) {
    issues.push({
      severity: 'error',
      category: 'Heavy Ads',
      message: 'Total ad script weight exceeds 1MB',
      detail: `Google Chrome Heavy Ad Intervention triggers at 4MB total, 4MB network, or 60s CPU. Current ad scripts: ${(totalAdWeight / 1024).toFixed(0)}KB. This can cause ad blocking.`,
    });
  } else if (totalAdWeight > 500000) {
    issues.push({
      severity: 'warning',
      category: 'Heavy Ads',
      message: 'Ad script weight approaching limit',
      detail: `Current ad scripts: ${(totalAdWeight / 1024).toFixed(0)}KB. Google recommends keeping total ad weight under 1MB for best performance.`,
    });
  }

  // InImage specific issues
  if (inImage.detected) {
    // Check for overlay/popup-like behavior
    if (html.includes('position: fixed') || html.includes('position:fixed')) {
      const fixedAdPattern = /(?:ad|banner|overlay|inimage|in-image)[\s\S]{0,500}position:\s*fixed/i;
      if (fixedAdPattern.test(html)) {
        issues.push({
          severity: 'error',
          category: 'Better Ads Standards',
          message: 'InImage ad may use fixed positioning',
          detail: 'Fixed positioning in ad containers can be classified as a "pop-up" ad by Google, violating Better Ads Standards. This can trigger Chrome ad filtering.',
        });
      }
    }

    // z-index abuse
    const zIndexMatches = html.matchAll(/z-index\s*:\s*(\d+)/g);
    let maxZIndex = 0;
    for (const match of zIndexMatches) {
      const val = parseInt(match[1]);
      if (val > maxZIndex) maxZIndex = val;
    }
    if (maxZIndex > 999999) {
      issues.push({
        severity: 'warning',
        category: 'Layout',
        message: `Very high z-index detected: ${maxZIndex}`,
        detail: 'Extremely high z-index values in ad code can cause layout issues and may trigger Google ad quality filters.',
      });
    }

    // MutationObserver overuse
    const mutationCount = (html.match(/MutationObserver/g) || []).length;
    if (mutationCount > 3) {
      issues.push({
        severity: 'warning',
        category: 'Performance',
        message: `${mutationCount} MutationObserver instances detected`,
        detail: 'Multiple MutationObservers from ad scripts can cause performance degradation and may trigger Chrome Heavy Ad Intervention.',
      });
    }

    // InImage without exclude selectors
    if (inImage.integrationMethod === 'direct' && inImage.excludeSelectors.length === 0) {
      issues.push({
        severity: 'warning',
        category: 'InImage Config',
        message: 'InImage integration without exclude selectors',
        detail: 'InImage ads without exclude selectors may overlay on navigation, logos, or other critical UI elements, causing poor user experience and potential Google policy violations.',
      });
    }

    issues.push({
      severity: 'info',
      category: 'InImage Format',
      message: `InImage detected: ${inImage.provider} via ${inImage.integrationMethod}`,
      detail: inImage.integrationMethod === 'gam'
        ? 'InImage delivered through GAM. Google may apply stricter checks on creatives served through its own platform. Ensure creative weight < 150KB and no excessive DOM manipulation.'
        : 'Direct InImage integration. Ensure compliance with Better Ads Standards: no auto-expanding, no sticky behavior, no excessive overlay area (>30% of image).',
    });
  }

  // CLS (Cumulative Layout Shift) indicators
  const noWidthHeight = (html.match(/<div[^>]*data-[^>]*ad[^>]*>/gi) || [])
    .filter(tag => !tag.includes('width') && !tag.includes('height')).length;
  if (noWidthHeight > 0) {
    issues.push({
      severity: 'warning',
      category: 'Core Web Vitals',
      message: `${noWidthHeight} ad containers without explicit dimensions`,
      detail: 'Ad containers without width/height cause Cumulative Layout Shift (CLS). Google uses CLS as a ranking signal and may penalize pages with high CLS scores.',
    });
  }

  // document.write
  if (html.includes('document.write') && (html.includes('ad') || html.includes('banner'))) {
    issues.push({
      severity: 'error',
      category: 'Performance',
      message: 'document.write detected in ad-related code',
      detail: 'document.write blocks parsing and is deprecated. Chrome may intervene and block scripts using document.write on slow connections.',
    });
  }

  // Too many third-party scripts
  const scriptSrcs = html.matchAll(/src\s*=\s*['"]([^'"]+)['"]/g);
  const domains = new Set<string>();
  for (const match of scriptSrcs) {
    try {
      const url = new URL(match[1], 'https://example.com');
      if (url.hostname !== 'example.com') domains.add(url.hostname);
    } catch { /* ignore */ }
  }
  if (domains.size > 15) {
    issues.push({
      severity: 'warning',
      category: 'Performance',
      message: `${domains.size} third-party domains detected`,
      detail: 'Large number of third-party requests increases load time and may trigger Google speed-related penalties.',
    });
  }

  // Forced click/redirect patterns
  if (html.match(/onclick\s*=\s*['"].*window\.open/i) || html.match(/onclick\s*=\s*['"].*location\.href/i)) {
    issues.push({
      severity: 'error',
      category: 'Abusive Ads',
      message: 'Potential forced redirect/popup detected',
      detail: 'onclick handlers with window.open or location.href changes in ad code can be classified as abusive advertising by Google.',
    });
  }

  return issues;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const startTime = Date.now();

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();
    const fetchTime = Date.now() - startTime;

    // Extract scripts
    const scripts: AdScript[] = [];
    const scriptRegex = /<script([^>]*)(?:>([\s\S]*?)<\/script>|\/?>)/gi;
    let scriptMatch;

    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const attrs = scriptMatch[1] || '';
      const content = scriptMatch[2] || '';
      const srcMatch = attrs.match(/src\s*=\s*['"]([^'"]+)['"]/);
      const src = srcMatch ? srcMatch[1] : '';
      const isAsync = /\basync\b/.test(attrs);
      const isDefer = /\bdefer\b/.test(attrs);
      const inHead = html.indexOf(scriptMatch[0]) < (html.indexOf('</head>') || html.length);

      const classification = classifyScript(src, content);

      if (classification.type !== 'unknown' || src) {
        scripts.push({
          src: src || '(inline)',
          size: src ? 'external' : `${content.length}B`,
          type: classification.type || 'unknown',
          async: isAsync,
          defer: isDefer,
          position: inHead ? 'head' : 'body',
          risk: classification.risk || 'low',
          note: classification.note || '',
        });
      }
    }

    // Extract ad containers
    const adContainers: AdContainer[] = [];
    const adDivRegex = /<(?:div|section|aside)[^>]*(?:data-(?:ad|hyb|ssp|dfp|gpt)|class\s*=\s*['"][^'"]*(?:ad-|ads-|adunit|ad_|banner|sponsor|adslot|gpt-ad)[^'"]*['"]|id\s*=\s*['"][^'"]*(?:ad-|ads-|ad_|banner|gpt-ad|dfp-|google_ads)[^'"]*['"])[^>]*>/gi;
    let containerMatch;

    while ((containerMatch = adDivRegex.exec(html)) !== null) {
      const tag = containerMatch[0];
      const idMatch = tag.match(/id\s*=\s*['"]([^'"]+)['"]/);
      const classMatch = tag.match(/class\s*=\s*['"]([^'"]+)['"]/);
      const styleMatch = tag.match(/style\s*=\s*['"]([^'"]+)['"]/);

      const dataAttrs: Record<string, string> = {};
      const dataMatches = tag.matchAll(/data-([a-z-]+)\s*=\s*['"]([^'"]*)['"]/gi);
      for (const dm of dataMatches) {
        dataAttrs[dm[1]] = dm[2];
      }

      let dimensions = null;
      if (styleMatch) {
        const widthMatch = styleMatch[1].match(/width\s*:\s*([^;]+)/);
        const heightMatch = styleMatch[1].match(/height\s*:\s*([^;]+)/);
        if (widthMatch || heightMatch) {
          dimensions = { width: widthMatch?.[1]?.trim() || 'auto', height: heightMatch?.[1]?.trim() || 'auto' };
        }
      }

      let type = 'display';
      if (tag.includes('hyb-ssp') || tag.includes('hbrd')) type = 'vox-ssp';
      else if (tag.includes('gpt-ad') || tag.includes('dfp')) type = 'gam';
      else if (tag.includes('adsbygoogle')) type = 'adsense';

      adContainers.push({
        id: idMatch?.[1] || '',
        classes: classMatch?.[1] || '',
        dataAttributes: dataAttrs,
        dimensions,
        type,
        inlineStyles: styleMatch?.[1] || '',
      });
    }

    // Detect InImage
    const inImageDetection = detectInImage(html);

    // Detect GAM
    const googleAdManager = detectGAM(html);

    // Calculate performance metrics
    const thirdPartyDomains: string[] = [];
    const scriptSrcMatches = html.matchAll(/src\s*=\s*['"]https?:\/\/([^/'"\s]+)/g);
    const domainSet = new Set<string>();
    for (const m of scriptSrcMatches) {
      domainSet.add(m[1]);
    }
    thirdPartyDomains.push(...domainSet);

    const inlineScriptContent = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    const inlineScriptSize = inlineScriptContent.reduce((acc, s) => acc + s.length, 0);

    const inlineStyleContent = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    const inlineStyleSize = inlineStyleContent.reduce((acc, s) => acc + s.length, 0);

    const performance = {
      totalAdScriptSize: `${(scripts.filter(s => s.type !== 'analytics' && s.type !== 'unknown').reduce((acc, s) => acc + (s.size === 'external' ? 0 : parseInt(s.size || '0')), 0) / 1024).toFixed(1)}KB (inline only)`,
      adScriptCount: scripts.filter(s => s.type !== 'analytics' && s.type !== 'unknown').length,
      thirdPartyDomains: thirdPartyDomains.slice(0, 50),
      hasLazyLoading: html.includes('loading="lazy"') || html.includes('IntersectionObserver'),
      usesIntersectionObserver: html.includes('IntersectionObserver'),
      mutationObserverCount: (html.match(/MutationObserver/g) || []).length,
    };

    const rawMetrics = {
      totalScripts: (html.match(/<script/g) || []).length,
      totalStylesheets: (html.match(/<link[^>]*stylesheet/g) || []).length + (html.match(/<style/g) || []).length,
      totalIframes: (html.match(/<iframe/g) || []).length,
      htmlSize: html.length,
      inlineScriptSize,
      inlineStyleSize,
    };

    // Find policy issues
    const policyIssues = findPolicyIssues(html, scripts, inImageDetection);

    const result: AnalysisResult = {
      url: targetUrl,
      fetchTime,
      pageSize: html.length,
      scripts,
      adContainers,
      inImageDetection,
      policyIssues,
      performance,
      rawMetrics,
      googleAdManager,
    };

    // Save scan log
    try {
      await saveScanLog(result);
    } catch (logError) {
      console.error('[AdDiagnostics] Failed to save scan log:', logError);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
