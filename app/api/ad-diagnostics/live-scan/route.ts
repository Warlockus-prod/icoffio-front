import { NextRequest, NextResponse } from 'next/server';
import { saveScanLog } from '@/lib/ad-diagnostics-logs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.url || !data.hostname) {
      return NextResponse.json({ error: 'url and hostname required' }, { status: 400 });
    }

    // Transform live scan data into the standard log format
    const result = {
      url: data.url,
      fetchTime: 0,
      pageSize: 0,
      scripts: (data.scripts || []).map((s: { src: string; type: string; async: boolean; defer: boolean }) => ({
        src: s.src,
        size: 'external',
        type: s.type === 'gam' ? 'gam' : s.type === 'hyb-ssp' ? 'inimage' : s.type === 'teads' ? 'inimage' : s.type,
        async: s.async || false,
        defer: s.defer || false,
        position: 'body',
        risk: 'low',
        note: 'Live browser scan',
      })),
      adContainers: (data.gamSlots || []).map((s: { id: string; w: number; h: number; filled: boolean }) => ({
        id: s.id,
        classes: '',
        dimensions: `${s.w}x${s.h}`,
        hasGptAttr: true,
      })),
      inImageDetection: {
        detected: (data.inImageOverlays || []).length > 0,
        provider: data.inImageOverlays?.[0]?.provider || null,
        integrationMethod: 'live-browser',
        scriptSrc: '',
        configFound: false,
        excludeSelectors: [],
        imageTargeting: '',
      },
      policyIssues: data.issues || [],
      performance: {
        totalAdScriptSize: '0KB',
        adScriptCount: (data.scripts || []).length,
        thirdPartyDomains: [],
        hasLazyLoading: false,
        usesIntersectionObserver: false,
        mutationObserverCount: 0,
      },
      rawMetrics: {
        totalScripts: (data.scripts || []).length,
        totalStylesheets: 0,
        totalIframes: 0,
        htmlSize: 0,
        inlineScriptSize: 0,
        inlineStyleSize: 0,
      },
      googleAdManager: {
        detected: (data.gamSlots || []).length > 0,
        networkId: null,
        slots: data.gamSlots || [],
      },
      // Live-specific data
      liveScan: true,
      viewport: data.viewport,
      userAgent: data.userAgent,
      inImageOverlays: data.inImageOverlays || [],
      consoleErrors: data.consoleErrors || [],
      networkErrors: data.networkErrors || [],
      measurements: data.measurements || {},
      images: data.images || [],
    };

    const id = await saveScanLog(result);

    return NextResponse.json({
      id,
      issues: data.issues?.length || 0,
      overlays: data.inImageOverlays?.length || 0,
      gamSlots: data.gamSlots?.length || 0,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// CORS headers for bookmarklet use from other domains
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
