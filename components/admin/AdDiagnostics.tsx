'use client';

import { useState, useCallback, useEffect } from 'react';

interface AdScript {
  src: string;
  size: string;
  type: string;
  async: boolean;
  defer: boolean;
  position: string;
  risk: string;
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
    integrationMethod: string;
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

interface ScanLogEntry {
  id: string;
  timestamp: string;
  url: string;
  hostname: string;
  pageSize: number;
  fetchTime: number;
  inImageDetected: boolean;
  inImageProvider: string | null;
  inImageMethod: string;
  gamDetected: boolean;
  gamNetworkId: string | null;
  adScriptCount: number;
  adContainerCount: number;
  mutationObserverCount: number;
  thirdPartyDomainCount: number;
  policyErrors: number;
  policyWarnings: number;
  policyIssues: Array<{ severity: string; category: string; message: string; detail: string }>;
}

interface FullScanLog extends ScanLogEntry {
  result: AnalysisResult;
}

interface ComparisonEntry {
  url: string;
  result: AnalysisResult;
  timestamp: number;
}

const SEVERITY_COLORS = {
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

const SEVERITY_ICONS = {
  error: '🔴',
  warning: '🟡',
  info: '🔵',
};

const RISK_COLORS = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-red-600 dark:text-red-400',
};

const TYPE_BADGES: Record<string, string> = {
  gam: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  vox: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  inimage: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  prebid: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  adsense: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  'other-ad': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  analytics: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  unknown: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
};

export default function AdDiagnostics() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<ComparisonEntry[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showComparison, setShowComparison] = useState(false);
  const [lang, setLang] = useState<'en' | 'ru' | 'pl'>('ru');
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<FullScanLog | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/ad-diagnostics/logs');
      if (res.ok) {
        const data = await res.json();
        setScanLogs(data.logs || []);
      }
    } catch { /* ignore */ } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ad-diagnostics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
      setHistory(prev => {
        const updated = [{ url: data.url, result: data, timestamp: Date.now() }, ...prev];
        return updated.slice(0, 10);
      });
      // Refresh logs list
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'inimage', label: 'InImage' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'containers', label: 'Ad Containers' },
    { id: 'gam', label: 'GAM' },
    { id: 'issues', label: 'Policy Issues' },
    { id: 'performance', label: 'Performance' },
    { id: 'history', label: `Scan History (${scanLogs.length})` },
    { id: 'live', label: 'Live Scanner' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Ad Diagnostics Tool
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Analyze ad implementations on any website. Detects InImage format, GAM integration, script weight,
          policy violations, and potential Google blocking reasons.
        </p>

        {/* URL Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
            placeholder="https://example.com/article-page"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : 'Analyze'}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Quick Links — History */}
        {history.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Recent:</span>
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setUrl(h.url); setResult(h.result); }}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 truncate max-w-[200px]"
                title={h.url}
              >
                {new URL(h.url).hostname}
              </button>
            ))}
            {history.length >= 2 && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                {showComparison ? 'Hide' : 'Compare'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {showComparison && history.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Site Comparison</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Metric</th>
                {history.slice(0, 5).map((h, i) => (
                  <th key={i} className="pb-2 px-2 font-medium text-gray-900 dark:text-white truncate max-w-[150px]" title={h.url}>
                    {new URL(h.url).hostname}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { label: 'InImage Detected', getValue: (r: AnalysisResult) => r.inImageDetection.detected ? `Yes (${r.inImageDetection.provider})` : 'No' },
                { label: 'Integration', getValue: (r: AnalysisResult) => r.inImageDetection.integrationMethod },
                { label: 'GAM', getValue: (r: AnalysisResult) => r.googleAdManager.detected ? 'Yes' : 'No' },
                { label: 'Ad Scripts', getValue: (r: AnalysisResult) => String(r.performance.adScriptCount) },
                { label: 'Page Size', getValue: (r: AnalysisResult) => `${(r.pageSize / 1024).toFixed(0)}KB` },
                { label: 'Fetch Time', getValue: (r: AnalysisResult) => `${r.fetchTime}ms` },
                { label: '3rd Party Domains', getValue: (r: AnalysisResult) => String(r.performance.thirdPartyDomains.length) },
                { label: 'MutationObservers', getValue: (r: AnalysisResult) => String(r.performance.mutationObserverCount) },
                { label: 'Policy Errors', getValue: (r: AnalysisResult) => String(r.policyIssues.filter(i => i.severity === 'error').length) },
                { label: 'Policy Warnings', getValue: (r: AnalysisResult) => String(r.policyIssues.filter(i => i.severity === 'warning').length) },
                { label: 'Total Scripts', getValue: (r: AnalysisResult) => String(r.rawMetrics.totalScripts) },
                { label: 'Iframes', getValue: (r: AnalysisResult) => String(r.rawMetrics.totalIframes) },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">{row.label}</td>
                  {history.slice(0, 5).map((h, i) => (
                    <td key={i} className="py-2 px-2 text-gray-900 dark:text-white">{row.getValue(h.result)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Section Tabs */}
          <div className="flex flex-wrap gap-1 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-sm border border-gray-200 dark:border-gray-700">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {s.label}
                {s.id === 'issues' && result.policyIssues.filter(i => i.severity === 'error').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {result.policyIssues.filter(i => i.severity === 'error').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Page Size" value={`${(result.pageSize / 1024).toFixed(0)}KB`} sub={`Fetched in ${result.fetchTime}ms`} />
              <MetricCard label="Ad Scripts" value={String(result.performance.adScriptCount)} sub={result.performance.totalAdScriptSize} />
              <MetricCard label="InImage" value={result.inImageDetection.detected ? 'Detected' : 'Not found'} sub={result.inImageDetection.provider || '—'} color={result.inImageDetection.detected ? 'text-red-600 dark:text-red-400' : undefined} />
              <MetricCard label="Policy Issues" value={String(result.policyIssues.filter(i => i.severity === 'error').length)} sub={`${result.policyIssues.filter(i => i.severity === 'warning').length} warnings`} color={result.policyIssues.some(i => i.severity === 'error') ? 'text-red-600 dark:text-red-400' : undefined} />
              <MetricCard label="GAM" value={result.googleAdManager.detected ? 'Active' : 'No'} sub={result.googleAdManager.networkId ? `Network: ${result.googleAdManager.networkId}` : '—'} />
              <MetricCard label="3rd Party" value={String(result.performance.thirdPartyDomains.length)} sub="domains" />
              <MetricCard label="Total Scripts" value={String(result.rawMetrics.totalScripts)} sub={`${result.rawMetrics.totalIframes} iframes`} />
              <MetricCard label="MutationObservers" value={String(result.performance.mutationObserverCount)} sub={result.performance.mutationObserverCount > 3 ? 'High — may cause issues' : 'Normal'} color={result.performance.mutationObserverCount > 3 ? 'text-yellow-600 dark:text-yellow-400' : undefined} />
            </div>
          )}

          {/* InImage Section */}
          {activeSection === 'inimage' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">InImage Format Analysis</h4>

              {result.inImageDetection.detected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Provider" value={result.inImageDetection.provider || 'Unknown'} />
                    <InfoRow label="Integration Method" value={result.inImageDetection.integrationMethod} />
                    <InfoRow label="Script Source" value={result.inImageDetection.scriptSrc || 'N/A'} mono />
                    <InfoRow label="Config Found" value={result.inImageDetection.configFound ? 'Yes' : 'No'} />
                  </div>

                  {result.inImageDetection.placeIds.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Place IDs</h5>
                      <div className="flex flex-wrap gap-2">
                        {result.inImageDetection.placeIds.map((id, i) => (
                          <code key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-white">
                            {id}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.inImageDetection.excludeSelectors.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exclude Selectors</h5>
                      <div className="flex flex-wrap gap-2">
                        {result.inImageDetection.excludeSelectors.map((sel, i) => (
                          <code key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-white">
                            {sel}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* InImage Google Policy Notes */}
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <h5 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Google Policy Notes for InImage</h5>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 list-disc list-inside">
                      <li>InImage ads via GAM: Google applies creative weight limits (150KB recommended)</li>
                      <li>Better Ads Standards: overlay must not exceed 30% of image area</li>
                      <li>Chrome Heavy Ad Intervention: 4MB network / 4MB total / 60s CPU limit</li>
                      <li>CLS impact: InImage overlays that shift layout can trigger Core Web Vitals penalties</li>
                      <li>Sticky/fixed behavior: may be classified as &quot;Sticky Ad&quot; violation</li>
                      <li>Auto-expanding: creatives that expand without user interaction violate policy</li>
                      {result.inImageDetection.integrationMethod === 'gam' && (
                        <li className="font-medium">GAM delivery detected — Google monitors creative behavior more strictly through its own stack</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                  No InImage format detected on this page. Try analyzing an article page with images.
                </div>
              )}
            </div>
          )}

          {/* Scripts Section */}
          {activeSection === 'scripts' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Ad & Tracking Scripts ({result.scripts.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="pb-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Source</th>
                      <th className="pb-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Size</th>
                      <th className="pb-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Load</th>
                      <th className="pb-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Position</th>
                      <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {result.scripts.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-2 pr-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGES[s.type] || TYPE_BADGES.unknown}`}>
                            {s.type}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="max-w-[300px] truncate font-mono text-xs text-gray-700 dark:text-gray-300" title={s.src}>
                            {s.src}
                          </div>
                          {s.note && <div className="text-xs text-gray-400 dark:text-gray-500">{s.note}</div>}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-600 dark:text-gray-400">{s.size}</td>
                        <td className="py-2 pr-3 text-xs">
                          {s.async && <span className="text-green-600 dark:text-green-400 mr-1">async</span>}
                          {s.defer && <span className="text-blue-600 dark:text-blue-400 mr-1">defer</span>}
                          {!s.async && !s.defer && <span className="text-red-600 dark:text-red-400">sync</span>}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400">{s.position}</td>
                        <td className={`py-2 text-xs font-medium ${RISK_COLORS[s.risk as keyof typeof RISK_COLORS] || ''}`}>{s.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ad Containers */}
          {activeSection === 'containers' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Ad Containers ({result.adContainers.length})
              </h4>
              {result.adContainers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No ad containers detected in static HTML. Containers may be injected dynamically by ad scripts.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.adContainers.map((c, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGES[c.type] || TYPE_BADGES.unknown}`}>
                          {c.type}
                        </span>
                        {c.id && <code className="text-xs font-mono text-gray-600 dark:text-gray-400">#{c.id}</code>}
                        {c.dimensions && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {c.dimensions.width} x {c.dimensions.height}
                          </span>
                        )}
                      </div>
                      {c.classes && (
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate" title={c.classes}>
                          .{c.classes.split(' ').join(' .')}
                        </div>
                      )}
                      {Object.keys(c.dataAttributes).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(c.dataAttributes).map(([k, v]) => (
                            <span key={k} className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                              data-{k}={v ? `"${v}"` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GAM Section */}
          {activeSection === 'gam' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Google Ad Manager (GAM)</h4>

              {result.googleAdManager.detected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Status" value="Detected" />
                    <InfoRow label="Network ID" value={result.googleAdManager.networkId || 'Not found'} mono />
                  </div>

                  {result.googleAdManager.slots.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ad Slots ({result.googleAdManager.slots.length})
                      </h5>
                      <div className="space-y-1">
                        {result.googleAdManager.slots.map((slot, i) => (
                          <code key={i} className="block px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-white">
                            {slot}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.googleAdManager.sizeOverrides.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size Mappings</h5>
                      <div className="space-y-1">
                        {result.googleAdManager.sizeOverrides.map((s, i) => (
                          <div key={i} className="text-xs font-mono text-gray-600 dark:text-gray-400">{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GAM + InImage integration notes */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2">GAM Integration Notes</h5>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5 list-disc list-inside">
                      <li>GAM can serve InImage creatives via line items with custom targeting</li>
                      <li>Google blocks creatives exceeding 150KB compressed or with heavy JS payloads</li>
                      <li>Creatives using document.write, eval(), or excessive DOM manipulation get flagged</li>
                      <li>SSL-only: all creative assets must be HTTPS</li>
                      <li>Creative audit: Google scans served creatives for malware, redirects, and policy violations</li>
                      <li>SafeFrame: if InImage breaks out of SafeFrame, it may trigger blocking</li>
                      <li>Frequency capping: excessive ad requests from same slot can trigger rate limiting</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                  Google Ad Manager not detected on this page.
                </div>
              )}
            </div>
          )}

          {/* Policy Issues */}
          {activeSection === 'issues' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Policy Issues ({result.policyIssues.length})
              </h4>

              {result.policyIssues.length === 0 ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400">
                  No policy issues detected in static analysis.
                </div>
              ) : (
                result.policyIssues
                  .sort((a, b) => {
                    const order = { error: 0, warning: 1, info: 2 };
                    return order[a.severity] - order[b.severity];
                  })
                  .map((issue, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${SEVERITY_COLORS[issue.severity]}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{SEVERITY_ICONS[issue.severity]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{issue.message}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-white/50 dark:bg-black/20 rounded">{issue.category}</span>
                          </div>
                          <p className="text-xs opacity-80">{issue.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))
              )}

              {/* General Google Policy Reference */}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Common Google Blocking Reasons</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li><b>Heavy Ad Intervention</b>: Chrome removes ads using &gt;4MB network, &gt;4MB total resources, or &gt;60s CPU</li>
                  <li><b>Better Ads Standards</b>: pop-ups, auto-play video with sound, prestitial countdowns, flashing animations</li>
                  <li><b>Coalition for Better Ads</b>: large sticky ads, full-screen scrollover, auto-expanding</li>
                  <li><b>Creative audit</b>: GAM scans creatives for malware, redirects, non-SSL resources</li>
                  <li><b>SafeFrame escape</b>: creatives breaking out of SafeFrame sandbox are blocked</li>
                  <li><b>CLS impact</b>: ads causing layout shift &gt;0.1 may reduce page ranking</li>
                  <li><b>Third-party cookie deprecation</b>: ad scripts relying on 3P cookies may malfunction</li>
                </ul>
              </div>
            </div>
          )}

          {/* Performance */}
          {activeSection === 'performance' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Performance Metrics</h4>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard label="HTML Size" value={`${(result.rawMetrics.htmlSize / 1024).toFixed(0)}KB`} sub="raw HTML" />
                <MetricCard label="Inline Scripts" value={`${(result.rawMetrics.inlineScriptSize / 1024).toFixed(0)}KB`} sub={`${result.rawMetrics.totalScripts} total scripts`} />
                <MetricCard label="Inline Styles" value={`${(result.rawMetrics.inlineStyleSize / 1024).toFixed(0)}KB`} sub={`${result.rawMetrics.totalStylesheets} stylesheets`} />
                <MetricCard label="Iframes" value={String(result.rawMetrics.totalIframes)} sub="on page" />
                <MetricCard label="Lazy Loading" value={result.performance.hasLazyLoading ? 'Yes' : 'No'} sub="" />
                <MetricCard label="IntersectionObserver" value={result.performance.usesIntersectionObserver ? 'Yes' : 'No'} sub="" />
              </div>

              {result.performance.thirdPartyDomains.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Third-Party Domains ({result.performance.thirdPartyDomains.length})
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {result.performance.thirdPartyDomains.slice(0, 30).map((d, i) => (
                      <code key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                        {d}
                      </code>
                    ))}
                    {result.performance.thirdPartyDomains.length > 30 && (
                      <span className="text-xs text-gray-400 self-center">
                        +{result.performance.thirdPartyDomains.length - 30} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan History */}
          {activeSection === 'history' && (
            <ScanHistory
              logs={scanLogs}
              loading={logsLoading}
              onRefresh={fetchLogs}
              onViewLog={async (id) => {
                try {
                  const res = await fetch(`/api/ad-diagnostics/logs?id=${id}`);
                  if (res.ok) {
                    const data = await res.json();
                    setSelectedLog(data);
                  }
                } catch { /* ignore */ }
              }}
              selectedLog={selectedLog}
              onCloseLog={() => setSelectedLog(null)}
              onLoadResult={(log) => {
                if (log.result) {
                  setResult(log.result);
                  setUrl(log.url);
                  setActiveSection('overview');
                }
              }}
              onDeleteLog={async (id) => {
                try {
                  await fetch(`/api/ad-diagnostics/logs?id=${id}`, { method: 'DELETE' });
                  fetchLogs();
                  if (selectedLog?.id === id) setSelectedLog(null);
                } catch { /* ignore */ }
              }}
              onDeleteAll={async () => {
                if (!confirm('Delete all scan logs?')) return;
                try {
                  await fetch('/api/ad-diagnostics/logs?id=all', { method: 'DELETE' });
                  setScanLogs([]);
                  setSelectedLog(null);
                } catch { /* ignore */ }
              }}
            />
          )}

          {/* Live Scanner */}
          {activeSection === 'live' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5">
              <h4 className="font-semibold text-gray-900 dark:text-white text-lg">Live Browser Scanner</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Scan any website in your real browser. The bookmarklet scrolls the page, detects InImage overlays,
                measures coverage %, captures GAM slot status, console errors, and sends results to this dashboard.
              </p>

              {/* Bookmarklet */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Bookmarklet (drag to bookmarks bar)</h5>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a
                    href={`javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://web.icoffio.com/ad-scanner.js?t='+Date.now()})))`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm cursor-grab hover:bg-blue-700 inline-block"
                    onClick={(e) => { e.preventDefault(); alert('Drag this button to your bookmarks bar!'); }}
                  >
                    Ad Scanner
                  </a>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Drag to bookmarks bar, then click on any website
                  </span>
                </div>
              </div>

              {/* Console snippet */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Console Snippet (alternative)</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Open DevTools (F12) → Console → paste and press Enter:
                </p>
                <div className="relative">
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
{`(function(){var s=document.createElement('script');
s.src='https://web.icoffio.com/ad-scanner.js?t='+Date.now();
document.head.appendChild(s);})();`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `(function(){var s=document.createElement('script');s.src='https://web.icoffio.com/ad-scanner.js?t='+Date.now();document.head.appendChild(s);})();`
                      );
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* How it works */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">How it works</h5>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                  <li><b>Opens floating panel</b> in bottom-right corner</li>
                  <li><b>Scans page structure</b> — ad scripts, GAM slots, article images</li>
                  <li><b>Intercepts console errors</b> — captures ad-related errors in real-time</li>
                  <li><b>Scrolls the page</b> — triggers lazy-loaded InImage ads (like real user)</li>
                  <li><b>Measures overlay size</b> — calculates % of image covered by ad overlay</li>
                  <li><b>Detects violations</b> — overlay &gt;30%, unfilled GAM slots, ad density</li>
                  <li><b>Click &quot;Send to API&quot;</b> — saves results to Scan History tab here</li>
                </ol>
              </div>

              {/* What it detects */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Critical Checks</div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                    <li>InImage overlay &gt; 30% image area</li>
                    <li>GAM slots unfilled (display:none)</li>
                    <li>Multiple ads in single viewport</li>
                    <li>Fixed positioning (popup detection)</li>
                  </ul>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">Warning Checks</div>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5">
                    <li>Ad-related console errors</li>
                    <li>Very high z-index values</li>
                    <li>5+ ads visible simultaneously</li>
                    <li>Network errors on ad domains</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Live Scanner (standalone when no result) */}
      {!result && !loading && activeSection !== 'live' && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-purple-900 dark:text-purple-200">Live Browser Scanner</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Scan any website from your browser</span>
            </div>
            <button
              onClick={() => setActiveSection('live')}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
            >
              Open Scanner
            </button>
          </div>
        </div>
      )}

      {/* Scan History (standalone when no result) */}
      {!result && !loading && scanLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Recent Scans ({scanLogs.length})
            </h4>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showHistory ? 'Hide' : 'Show all'}
            </button>
          </div>
          <div className="space-y-2">
            {scanLogs.slice(0, showHistory ? 50 : 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white truncate">{log.hostname}</span>
                  {log.inImageDetected && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-xs">InImage</span>}
                  {log.gamDetected && <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">GAM</span>}
                  {log.policyErrors > 0 && <span className="text-xs text-red-600 dark:text-red-400">{log.policyErrors} err</span>}
                </div>
                <button
                  onClick={() => { setUrl(log.url); analyze(); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap ml-2"
                >
                  Re-scan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Base */}
      {!result && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">InImage Format & Google Blocking — Knowledge Base</h4>
            <div className="flex gap-1">
              {(['ru', 'pl', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    lang === l ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {lang === 'ru' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Что такое InImage?</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  InImage — формат рекламы, который накладывает баннер поверх редакционных изображений на странице.
                  Может доставляться напрямую (VOX/Hybrid, Teads, Seedtag) или через Google Ad Manager (GAM).
                </p>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Почему Google блокирует</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Вес креатива превышает 150KB (аудит креативов GAM)</li>
                  <li>Тяжёлые манипуляции с DOM (циклы MutationObserver)</li>
                  <li>Выход за пределы SafeFrame-песочницы</li>
                  <li>Fixed/sticky позиционирование — нарушение политики</li>
                  <li>Площадь оверлея превышает 30% изображения</li>
                  <li>Авто-раскрытие без взаимодействия пользователя</li>
                  <li>Ресурсы без SSL (HTTP вместо HTTPS)</li>
                  <li>Chrome Heavy Ad Intervention: лимит 4MB сеть / 4MB ресурсы / 60сек CPU</li>
                </ul>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Что проверяет этот инструмент</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Наличие InImage формата и его провайдера</li>
                  <li>Метод интеграции (прямой код или через GAM)</li>
                  <li>Все рекламные скрипты: тип, вес, async/defer/sync</li>
                  <li>Контейнеры рекламы и их размеры</li>
                  <li>Настройки GAM: network ID, слоты, size mappings</li>
                  <li>Нарушения политик Google (Heavy Ads, Better Ads, CLS)</li>
                  <li>Количество сторонних доменов и MutationObserver</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Как пользоваться</h5>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                  <li>Вставьте URL любого сайта с рекламой (лучше всего — страница статьи с картинками)</li>
                  <li>Нажмите &quot;Analyze&quot; или Enter</li>
                  <li>Перейдите во вкладку &quot;InImage&quot; — проверьте формат и конфигурацию</li>
                  <li>Вкладка &quot;Policy Issues&quot; — потенциальные причины блокировки</li>
                  <li>Вкладка &quot;Scripts&quot; — вес и паттерны загрузки скриптов</li>
                  <li>Проанализируйте несколько сайтов и нажмите &quot;Compare&quot; для сравнения</li>
                </ol>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Как сравнивать сайты</h5>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                  <li>Проанализируйте первый сайт (например, ваш с прямой интеграцией)</li>
                  <li>Проанализируйте второй сайт (паблишер с интеграцией через GAM)</li>
                  <li>Нажмите кнопку &quot;Compare&quot; рядом с историей</li>
                  <li>Таблица покажет различия: InImage провайдер, кол-во скриптов, вес, ошибки</li>
                </ol>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Ограничения</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Статический анализ HTML — динамические скрипты (загруженные через JS) могут быть не видны</li>
                  <li>Нельзя измерить реальный вес внешних скриптов (только inline)</li>
                  <li>Для измерения CLS и CPU используйте Chrome DevTools → Performance</li>
                  <li>Некоторые сайты могут блокировать серверные запросы</li>
                </ul>
              </div>
            </div>
          )}

          {lang === 'pl' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Czym jest InImage?</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  InImage to format reklamy, w którym baner wyświetla się na obrazach redakcyjnych na stronie.
                  Może być dostarczany bezpośrednio (VOX/Hybrid, Teads, Seedtag) lub przez Google Ad Manager (GAM).
                </p>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Dlaczego Google blokuje</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Waga kreacji przekracza 150KB (audyt kreacji GAM)</li>
                  <li>Ciężkie manipulacje DOM (pętle MutationObserver)</li>
                  <li>Wyjście poza sandbox SafeFrame</li>
                  <li>Pozycjonowanie fixed/sticky — naruszenie polityki</li>
                  <li>Powierzchnia nakładki przekracza 30% obrazu</li>
                  <li>Automatyczne rozwijanie bez interakcji użytkownika</li>
                  <li>Zasoby bez SSL (HTTP zamiast HTTPS)</li>
                  <li>Chrome Heavy Ad Intervention: limit 4MB sieć / 4MB zasoby / 60sek CPU</li>
                </ul>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Co sprawdza to narzędzie</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Obecność formatu InImage i jego dostawcy</li>
                  <li>Metoda integracji (bezpośredni kod lub przez GAM)</li>
                  <li>Wszystkie skrypty reklamowe: typ, waga, async/defer/sync</li>
                  <li>Kontenery reklamowe i ich wymiary</li>
                  <li>Ustawienia GAM: network ID, sloty, mapowania rozmiarów</li>
                  <li>Naruszenia polityk Google (Heavy Ads, Better Ads, CLS)</li>
                  <li>Liczba domen zewnętrznych i MutationObserver</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Jak korzystać</h5>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                  <li>Wklej URL dowolnej strony z reklamami (najlepiej strona artykułu z obrazami)</li>
                  <li>Naciśnij &quot;Analyze&quot; lub Enter</li>
                  <li>Przejdź do zakładki &quot;InImage&quot; — sprawdź format i konfigurację</li>
                  <li>Zakładka &quot;Policy Issues&quot; — potencjalne przyczyny blokowania</li>
                  <li>Zakładka &quot;Scripts&quot; — waga i wzorce ładowania skryptów</li>
                  <li>Przeanalizuj kilka stron i naciśnij &quot;Compare&quot; aby porównać</li>
                </ol>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Jak porównywać strony</h5>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                  <li>Przeanalizuj pierwszą stronę (np. z bezpośrednią integracją)</li>
                  <li>Przeanalizuj drugą stronę (wydawca z integracją przez GAM)</li>
                  <li>Naciśnij przycisk &quot;Compare&quot; obok historii</li>
                  <li>Tabela pokaże różnice: dostawca InImage, liczba skryptów, waga, błędy</li>
                </ol>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Ograniczenia</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Statyczna analiza HTML — dynamiczne skrypty (ładowane przez JS) mogą być niewidoczne</li>
                  <li>Nie można zmierzyć rzeczywistej wagi zewnętrznych skryptów (tylko inline)</li>
                  <li>Do pomiaru CLS i CPU użyj Chrome DevTools → Performance</li>
                  <li>Niektóre strony mogą blokować żądania serwerowe</li>
                </ul>
              </div>
            </div>
          )}

          {lang === 'en' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">What is InImage?</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  InImage is an ad format that overlays advertising content on top of editorial images.
                  It can be served directly (VOX/Hybrid, Teads, Seedtag) or through GAM as a creative type.
                </p>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Why Google Blocks</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Creative weight exceeds 150KB (GAM creative audit)</li>
                  <li>Heavy DOM manipulation (MutationObserver loops)</li>
                  <li>Breaking SafeFrame sandbox</li>
                  <li>Fixed/sticky positioning classified as policy violation</li>
                  <li>Overlay area exceeds 30% of image</li>
                  <li>Auto-expanding without user interaction</li>
                  <li>Non-SSL resources in creative</li>
                  <li>Chrome Heavy Ad Intervention: 4MB network / 4MB total / 60s CPU limit</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">How to Use This Tool</h5>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                  <li>Enter any website URL with ads (article pages work best)</li>
                  <li>Check InImage tab for format detection and configuration</li>
                  <li>Review Policy Issues for potential blocking reasons</li>
                  <li>Compare multiple sites to find differences</li>
                  <li>Check Scripts tab for weight and loading patterns</li>
                </ol>

                <h5 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">Limitations</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Static HTML analysis — some ads load dynamically via JS</li>
                  <li>Cannot measure actual network weight of external scripts</li>
                  <li>Cannot measure real CLS or CPU usage (use Chrome DevTools for that)</li>
                  <li>Some sites may block server-side requests</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color || 'text-gray-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-sm font-medium text-gray-900 dark:text-white mt-0.5 ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function ScanHistory({
  logs, loading, onRefresh, onViewLog, selectedLog, onCloseLog, onLoadResult, onDeleteLog, onDeleteAll,
}: {
  logs: ScanLogEntry[];
  loading: boolean;
  onRefresh: () => void;
  onViewLog: (id: string) => void;
  selectedLog: FullScanLog | null;
  onCloseLog: () => void;
  onLoadResult: (log: FullScanLog) => void;
  onDeleteLog: (id: string) => void;
  onDeleteAll: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inimage' | 'gam' | 'errors'>('all');

  const filtered = logs.filter(log => {
    if (filter && !log.hostname.includes(filter) && !log.url.includes(filter)) return false;
    if (filterType === 'inimage' && !log.inImageDetected) return false;
    if (filterType === 'gam' && !log.gamDetected) return false;
    if (filterType === 'errors' && log.policyErrors === 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Scan History ({logs.length} total, {filtered.length} shown)
          </h4>
          <div className="flex gap-2">
            <button onClick={onRefresh} disabled={loading} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <a
              href="/api/ad-diagnostics/logs?format=download-all"
              download
              className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              Download All (JSON)
            </a>
            <button onClick={onDeleteAll} className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800">
              Clear All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by hostname..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <div className="flex gap-1">
            {([['all', 'All'], ['inimage', 'InImage'], ['gam', 'GAM'], ['errors', 'Errors']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-medium ${
                  filterType === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 text-center">
            {logs.length === 0 ? 'No scans yet. Analyze a URL to start logging.' : 'No scans match the current filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">Site</th>
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">Size</th>
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">InImage</th>
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">GAM</th>
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">Scripts</th>
                  <th className="pb-2 pr-2 font-medium text-gray-500 dark:text-gray-400">Issues</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="font-medium text-gray-900 dark:text-white text-xs">{log.hostname}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]" title={log.url}>{log.url}</div>
                    </td>
                    <td className="py-2 pr-2 text-xs text-gray-600 dark:text-gray-400">{(log.pageSize / 1024).toFixed(0)}KB</td>
                    <td className="py-2 pr-2">
                      {log.inImageDetected ? (
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-xs">{log.inImageProvider || 'Yes'}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {log.gamDetected ? (
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {log.gamNetworkId || 'Yes'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-xs text-gray-600 dark:text-gray-400">{log.adScriptCount}</td>
                    <td className="py-2 pr-2">
                      {log.policyErrors > 0 && <span className="text-xs text-red-600 dark:text-red-400 mr-1">{log.policyErrors}E</span>}
                      {log.policyWarnings > 0 && <span className="text-xs text-yellow-600 dark:text-yellow-400">{log.policyWarnings}W</span>}
                      {log.policyErrors === 0 && log.policyWarnings === 0 && <span className="text-xs text-green-600 dark:text-green-400">OK</span>}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onViewLog(log.id)}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="View full details"
                        >
                          View
                        </button>
                        <a
                          href={`/api/ad-diagnostics/logs?id=${log.id}&format=download`}
                          download
                          className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-800"
                          title="Download JSON"
                        >
                          JSON
                        </a>
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-800"
                          title="Delete this log"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Log Detail Modal */}
      {selectedLog && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Scan Detail: {selectedLog.hostname}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => onLoadResult(selectedLog)}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Load in Analyzer
              </button>
              <a
                href={`/api/ad-diagnostics/logs?id=${selectedLog.id}&format=download`}
                download
                className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200"
              >
                Download JSON
              </a>
              <button onClick={onCloseLog} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">URL</div>
              <div className="font-mono text-gray-900 dark:text-white break-all">{selectedLog.url}</div>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">Scanned</div>
              <div className="text-gray-900 dark:text-white">{new Date(selectedLog.timestamp).toLocaleString('ru-RU')}</div>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">Page / Fetch</div>
              <div className="text-gray-900 dark:text-white">{(selectedLog.pageSize / 1024).toFixed(0)}KB / {selectedLog.fetchTime}ms</div>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">Ad Scripts / Containers</div>
              <div className="text-gray-900 dark:text-white">{selectedLog.adScriptCount} / {selectedLog.adContainerCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">InImage</div>
              <div className="text-gray-900 dark:text-white">{selectedLog.inImageDetected ? `${selectedLog.inImageProvider} (${selectedLog.inImageMethod})` : 'Not detected'}</div>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">GAM</div>
              <div className="text-gray-900 dark:text-white">{selectedLog.gamDetected ? `Yes (${selectedLog.gamNetworkId || 'no network ID'})` : 'No'}</div>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">MutationObservers</div>
              <div className={`font-medium ${selectedLog.mutationObserverCount > 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>{selectedLog.mutationObserverCount}</div>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400">3rd Party Domains</div>
              <div className="text-gray-900 dark:text-white">{selectedLog.thirdPartyDomainCount}</div>
            </div>
          </div>

          {/* Policy Issues */}
          {selectedLog.policyIssues.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Policy Issues</h5>
              {selectedLog.policyIssues
                .sort((a, b) => {
                  const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
                  return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
                })
                .map((issue, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-xs ${
                    issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' :
                    issue.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  }`}>
                    <div className="font-medium">[{issue.category}] {issue.message}</div>
                    <div className="opacity-80 mt-0.5">{issue.detail}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
