'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { InfoThemeToggle } from './InfoThemeToggle';
import type { WatchTopicFull, WatchReport } from '@/lib/info/watch-types';

const TYPE_ICONS: Record<string, string> = {
  competitor: '🏢',
  trend: '📈',
  industry: '🏭',
};

const TYPE_LABELS: Record<string, string> = {
  competitor: 'Competitor',
  trend: 'Trend',
  industry: 'Industry',
};

const LANG_FLAGS: Record<string, string> = {
  ru: '🇷🇺', pl: '🇵🇱', en: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸',
};

const LANG_NAMES: Record<string, string> = {
  ru: 'Русский', pl: 'Polski', en: 'English',
};

const SENTIMENT_ICONS: Record<string, string> = {
  positive: '🟢', negative: '🔴', neutral: '🟡',
};

// Simple SVG sparkline
function Sparkline({ data, width = 120, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400" />
    </svg>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function renderReport(content: string): string {
  return content
    .replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-[#333] dark:text-[#e0e0e0]">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold mt-3 mb-1 text-[#333] dark:text-[#e0e0e0]">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(\d+)\]/g, '<span class="text-blue-600 dark:text-blue-400 text-xs font-medium">[$1]</span>')
    .replace(/^[-•] (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="list-disc mb-3">$1</ul>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');
}

export function InfoWatchPage() {
  const [topics, setTopics] = useState<WatchTopicFull[]>([]);
  const [topicItems, setTopicItems] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState('');

  // Add/edit forms
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', keywords: '', topic_type: 'trend', search_langs: 'en,ru', extra_sources: '',
  });

  // Reports
  const [activeReportTopic, setActiveReportTopic] = useState<number | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<WatchReport[]>([]);
  const [generatingReport, setGeneratingReport] = useState<number | 'all' | null>(null);
  const [searchingTopic, setSearchingTopic] = useState<number | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [reportLang, setReportLang] = useState<string>('en');
  const [translatingItem, setTranslatingItem] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, { title: string }>>({});

  // Sources editor
  const [editingSources, setEditingSources] = useState<number | null>(null);
  const [sourcesInput, setSourcesInput] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Sparklines
  const [sparklines, setSparklines] = useState<Record<number, number[]>>({});

  // Comparison view
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [compareType, setCompareType] = useState('competitor');

  // Analyze state
  const [analyzing, setAnalyzing] = useState(false);

  // Analytics panels
  const [showKeywords, setShowKeywords] = useState(false);
  const [keywordsData, setKeywordsData] = useState<{ word: string; count: number }[]>([]);
  const [keywordsTopicId, setKeywordsTopicId] = useState<number | null>(null);
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [reportDiffData, setReportDiffData] = useState<Record<number, any>>({});

  // Topic filter
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterName, setFilterName] = useState('');

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Bulk actions
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [showBulkBar, setShowBulkBar] = useState(false);

  // Article pagination per topic
  const [topicLimits, setTopicLimits] = useState<Record<number, number>>({});

  // Drag state
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // Mobile menu
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  // Computed: filtered topics
  const filteredTopics = topics.filter(t => {
    if (filterGroup && (t.topic_group || '') !== filterGroup) return false;
    if (filterType && t.topic_type !== filterType) return false;
    if (filterName && !t.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  // All unique groups
  const allGroups = [...new Set(topics.map(t => t.topic_group).filter(Boolean))] as string[];

  // Toggle collapsed group
  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  // Bulk select
  const toggleSelect = (id: number) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedTopics.size === filteredTopics.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(filteredTopics.map(t => t.id)));
    }
  };
  const bulkUpdateField = async (field: string, value: any) => {
    const ids = Array.from(selectedTopics);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id =>
        fetch('/api/info/watch/topics', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, [field]: value }),
        })
      ));
      flash(`Updated ${ids.length} topics`);
      setSelectedTopics(new Set());
      loadTopics();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  // Drag & drop
  const handleDragStart = (id: number) => { setDragId(id); };
  const handleDragOver = (e: React.DragEvent, id: number) => { e.preventDefault(); setDragOverId(id); };
  const handleDragEnd = async () => {
    if (dragId !== null && dragOverId !== null && dragId !== dragOverId) {
      const fromIdx = topics.findIndex(t => t.id === dragId);
      const toIdx = topics.findIndex(t => t.id === dragOverId);
      if (fromIdx >= 0 && toIdx >= 0) {
        await Promise.all([
          fetch('/api/info/watch/topics', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dragId, sort_order: topics[toIdx].sort_order }),
          }),
          fetch('/api/info/watch/topics', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dragOverId, sort_order: topics[fromIdx].sort_order }),
          }),
        ]);
        loadTopics();
      }
    }
    setDragId(null);
    setDragOverId(null);
  };

  // Load more articles for a topic
  const loadMoreItems = async (topicId: number) => {
    const currentLimit = topicLimits[topicId] || 15;
    const newLimit = currentLimit + 15;
    try {
      const res = await fetch(`/api/info/watch/items?topic_id=${topicId}&limit=${newLimit}`);
      const data = await res.json();
      setTopicItems(prev => ({ ...prev, [topicId]: data.items || [] }));
      setTopicLimits(prev => ({ ...prev, [topicId]: newLimit }));
    } catch {}
  };

  // Export comparison to CSV
  const exportCSV = () => {
    if (compareData.length === 0) return;
    const headers = ['Name', 'Mentions', 'SoV%', 'Trend%', 'Positive', 'Neutral', 'Negative', 'Sentiment Score', 'Quality', 'Tags', 'Latest'];
    const rows = compareData.map((r: any) => [
      r.name, r.total_mentions, r.share_of_voice || 0, r.trend_pct || 0,
      r.positive || 0, r.neutral || 0, r.negative || 0,
      r.sentiment_score || 0, Math.round(r.quality_score || 0),
      (r.top_tags || []).join('; '),
      r.latest_article ? new Date(r.latest_article).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `watch-compare-${compareType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Export report as PDF (uses print dialog)
  const exportReportPDF = (topicName: string, content: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Report: ${topicName}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}
      h2,h3{margin-top:1.5em}ul{padding-left:1.5em}li{margin-bottom:0.5em}
      .citation{color:#2563eb;font-size:0.85em;font-weight:500}
      @media print{body{margin:0;padding:15px}}</style></head><body>
      <h1>Report: ${topicName}</h1><p style="color:#888">${new Date().toLocaleDateString()}</p><hr>
      ${content.replace(/\[(\d+)\]/g, '<span class="citation">[$1]</span>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
        .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')}
      <hr><p style="color:#888;font-size:0.8em">Generated by icoffio Market Watch</p>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // Search
  const doSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/info/watch/items?q=${encodeURIComponent(searchQuery)}&limit=50`);
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  // Load sparklines for all topics
  const loadSparklines = async (topicIds: number[]) => {
    const map: Record<number, number[]> = {};
    await Promise.all(topicIds.map(async (id) => {
      try {
        const res = await fetch(`/api/info/watch/stats?topic_id=${id}&days=30`);
        const data = await res.json();
        // Fill 30 days with counts
        const days: Record<string, number> = {};
        for (const row of (data.sparkline || [])) {
          days[row.day] = parseInt(row.cnt);
        }
        const arr: number[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
          arr.push(days[d] || 0);
        }
        map[id] = arr;
      } catch { map[id] = []; }
    }));
    setSparklines(map);
  };

  // Comparison
  const loadComparison = async (type: string) => {
    try {
      const res = await fetch(`/api/info/watch/compare?type=${type}&days=7`);
      const data = await res.json();
      setCompareData(data.comparison || []);
    } catch {}
  };

  // Run analysis (dedup + sentiment + quality)
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/info/watch/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      flash(`Analysis: ${data.deduplicated || 0} deduped, ${data.sentiment_analyzed || 0} sentiment analyzed`);
      loadAllItems(topics.map(t => t.id));
    } catch (err: any) {
      flash(`Error: ${err.message}`);
    } finally { setAnalyzing(false); }
  };

  const loadKeywords = async (topicId?: number) => {
    try {
      const url = topicId
        ? `/api/info/watch/analytics?type=keywords&topic_id=${topicId}&days=14`
        : `/api/info/watch/analytics?type=keywords&days=14`;
      const res = await fetch(url);
      const data = await res.json();
      setKeywordsData(data.keywords || []);
      setKeywordsTopicId(topicId || null);
    } catch {}
  };

  const loadCorrelation = async () => {
    try {
      const res = await fetch('/api/info/watch/analytics?type=correlation&days=14');
      const data = await res.json();
      setCorrelationData(data.correlations || []);
    } catch {}
  };

  const loadReportDiff = async (topicId: number) => {
    try {
      const res = await fetch(`/api/info/watch/analytics?type=report_diff&topic_id=${topicId}`);
      const data = await res.json();
      setReportDiffData(prev => ({ ...prev, [topicId]: data.diff }));
    } catch {}
  };

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch('/api/info/watch/topics');
      const data = await res.json();
      const topicsRaw = data.topics || [];
      const enriched: WatchTopicFull[] = topicsRaw.map((t: any) => ({
        ...t, items: [], latest_report: null, item_count: 0,
      }));
      setTopics(enriched);
    } catch (err) {
      console.error('Failed to load topics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load items for all topics on mount
  const loadAllItems = useCallback(async (topicIds: number[]) => {
    const itemsMap: Record<number, any[]> = {};
    await Promise.all(topicIds.map(async (id) => {
      try {
        const res = await fetch(`/api/info/watch/items?topic_id=${id}&limit=15`);
        const data = await res.json();
        itemsMap[id] = data.items || [];
      } catch { itemsMap[id] = []; }
    }));
    setTopicItems(prev => ({ ...prev, ...itemsMap }));
  }, []);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  useEffect(() => {
    if (topics.length > 0) {
      loadAllItems(topics.map(t => t.id));
      loadSparklines(topics.map(t => t.id));
    }
  }, [topics, loadAllItems]);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.authenticated) setIsAdmin(true); })
      .catch(() => {});
    try {
      const session = localStorage.getItem('admin_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.token && parsed.expires > Date.now()) setIsAdmin(true);
      }
    } catch {}
  }, []);

  const searchTopic = async (topicId: number) => {
    setSearchingTopic(topicId);
    try {
      const res = await fetch('/api/info/watch/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const data = await res.json();
      flash(`Found ${data.inserted || 0} articles`);
      // Reload items for this topic
      const itemsRes = await fetch(`/api/info/watch/items?topic_id=${topicId}&limit=15`);
      const itemsData = await itemsRes.json();
      setTopicItems(prev => ({ ...prev, [topicId]: itemsData.items || [] }));
    } catch (err: any) {
      flash(`Search error: ${err.message}`);
    } finally {
      setSearchingTopic(null);
    }
  };

  const fetchAllTopics = async () => {
    setFetchingAll(true);
    try {
      const res = await fetch('/api/info/watch/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      flash(`Fetched ${data.total || 0} articles from ${data.topics || 0} topics`);
      await loadAllItems(topics.map(t => t.id));
    } catch (err: any) {
      flash(`Error: ${err.message}`);
    } finally {
      setFetchingAll(false);
    }
  };

  const translateItem = async (itemId: number, text: string, targetLang: string) => {
    setTranslatingItem(itemId);
    try {
      const res = await fetch('/api/info/watch/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_lang: targetLang }),
      });
      const data = await res.json();
      if (data.translated) {
        setTranslations(prev => ({ ...prev, [itemId]: { title: data.translated } }));
      }
    } catch (err: any) {
      flash(`Translation error: ${err.message}`);
    } finally {
      setTranslatingItem(null);
    }
  };

  const generateReport = async (topicId: number) => {
    setGeneratingReport(topicId);
    setActiveReportTopic(topicId);
    try {
      const res = await fetch('/api/info/watch/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, lang: reportLang }),
      });
      const data = await res.json();
      if (data.report) {
        setActiveReport(data.report);
        const histRes = await fetch(`/api/info/watch/report?topic_id=${topicId}&limit=5`);
        const histData = await histRes.json();
        setReportHistory(histData.reports || []);
        flash('AI report generated!');
      } else {
        flash(data.error || 'Failed to generate report');
      }
    } catch (err: any) {
      flash(`Report error: ${err.message}`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateAllReports = async () => {
    setGeneratingReport('all');
    try {
      const res = await fetch('/api/info/watch/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, lang: reportLang }),
      });
      const data = await res.json();
      const results = data.results || [];
      const ok = results.filter((r: any) => r.ok).length;
      const fail = results.filter((r: any) => !r.ok).length;
      const errors = results.filter((r: any) => !r.ok).map((r: any) => r.error).join('; ');
      flash(`Generated ${ok} reports${fail ? `, ${fail} failed: ${errors}` : ''}`);
      // Auto-open the first successful topic's report
      const firstOk = results.find((r: any) => r.ok);
      if (firstOk) {
        await viewReport(firstOk.topic_id);
      }
    } catch (err: any) {
      flash(`Error: ${err.message}`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const viewReport = async (topicId: number) => {
    if (activeReportTopic === topicId) {
      setActiveReportTopic(null);
      setActiveReport(null);
      setReportHistory([]);
      return;
    }
    setActiveReportTopic(topicId);
    setActiveReport(null);
    try {
      const res = await fetch(`/api/info/watch/report?topic_id=${topicId}&limit=5`);
      const data = await res.json();
      setReportHistory(data.reports || []);
      if (data.reports?.length > 0) {
        setActiveReport(data.reports[0].content);
      }
    } catch {}
  };

  const addTopic = async () => {
    if (!addForm.name || !addForm.keywords) return;
    try {
      await fetch('/api/info/watch/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          keywords: addForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
          topic_type: addForm.topic_type,
          search_langs: addForm.search_langs.split(',').map(l => l.trim()).filter(Boolean),
          extra_sources: addForm.extra_sources.split('\n').map(s => s.trim()).filter(Boolean),
          sort_order: (topics.length + 1) * 10,
        }),
      });
      setAddForm({ name: '', keywords: '', topic_type: 'trend', search_langs: 'en,ru', extra_sources: '' });
      setShowAdd(false);
      flash('Topic added!');
      loadTopics();
    } catch (err: any) {
      flash(`Error: ${err.message}`);
    }
  };

  const deleteTopic = async (id: number) => {
    if (!confirm('Delete this topic and all its data?')) return;
    try {
      await fetch(`/api/info/watch/topics?id=${id}`, { method: 'DELETE' });
      flash('Topic deleted');
      loadTopics();
    } catch (err: any) {
      flash(`Delete error: ${err.message}`);
    }
  };

  const moveTopic = async (id: number, direction: 'up' | 'down') => {
    const idx = topics.findIndex(t => t.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= topics.length) return;

    // Swap sort_orders; if equal, force different values
    let newSortA = topics[swapIdx].sort_order;
    let newSortB = topics[idx].sort_order;
    if (newSortA === newSortB) {
      newSortA = direction === 'up' ? newSortB - 1 : newSortB + 1;
    }

    await Promise.all([
      fetch('/api/info/watch/topics', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topics[idx].id, sort_order: newSortA }),
      }),
      fetch('/api/info/watch/topics', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topics[swapIdx].id, sort_order: newSortB }),
      }),
    ]);
    flash(`Moved "${topics[idx].name}" ${direction}`);
    loadTopics();
  };

  const saveSources = async (topicId: number, reportDays?: number, topicGroup?: string) => {
    const sources = sourcesInput.split('\n').map(s => s.trim()).filter(Boolean);
    const payload: any = { id: topicId, extra_sources: sources };
    if (reportDays && reportDays > 0) payload.report_days = reportDays;
    if (topicGroup !== undefined) payload.topic_group = topicGroup || null;
    await fetch('/api/info/watch/topics', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditingSources(null);
    flash('Sources & settings saved!');
    loadTopics();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] transition-colors">
      {/* Header — mobile responsive */}
      <header className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/en/info" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              &larr; <span className="hidden sm:inline">infomate</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-[#333] dark:text-[#e0e0e0]">Market Watch</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Language selector - always visible */}
            <div className="flex items-center gap-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
              {['en', 'pl', 'ru'].map(lang => (
                <button key={lang} onClick={() => setReportLang(lang)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    reportLang === lang
                      ? 'bg-white dark:bg-gray-500 text-[#333] dark:text-white shadow-sm font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {LANG_FLAGS[lang]}
                </button>
              ))}
            </div>
            <InfoThemeToggle />
            {/* Mobile hamburger */}
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden px-2 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {showMobileMenu ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Action buttons — desktop: inline row, mobile: dropdown */}
        <div className={`${showMobileMenu ? 'flex' : 'hidden'} sm:flex flex-wrap items-center gap-2 mt-3`}>
          <button onClick={generateAllReports} disabled={generatingReport !== null}
            className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {generatingReport === 'all' ? '🤖 ...' : '🤖 All Reports'}
          </button>
          <button onClick={() => { setShowCompare(!showCompare); if (!showCompare) loadComparison(compareType); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${showCompare ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            📋 Compare
          </button>
          <button onClick={() => { setShowKeywords(!showKeywords); if (!showKeywords) loadKeywords(); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${showKeywords ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            ☁️ Keywords
          </button>
          <button onClick={() => { setShowCorrelation(!showCorrelation); if (!showCorrelation) loadCorrelation(); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${showCorrelation ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            🔗 Correlation
          </button>
          {isAdmin && (
            <>
              <button onClick={runAnalysis} disabled={analyzing}
                className="px-3 py-1.5 text-sm rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {analyzing ? '⏳...' : '🧠 Analyze'}
              </button>
              <button onClick={fetchAllTopics} disabled={fetchingAll}
                className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                {fetchingAll ? '⏳...' : '🔄 Fetch All'}
              </button>
              <button onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  editMode ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                {editMode ? '✏️ Editing' : '✏️ Edit'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Search + Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2 space-y-2">
        <div className="flex gap-2">
          <input type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="🔍 Search across all articles..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16213e] text-sm text-[#333] dark:text-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}
              className="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500">✕</button>
          )}
        </div>
        {/* Topic Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-400">Filter:</span>
          <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)}
            placeholder="Topic name..."
            className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16213e] text-[#333] dark:text-[#e0e0e0] w-32" />
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16213e] text-[#333] dark:text-[#e0e0e0]">
            <option value="">All Groups</option>
            {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
            <option value="">Ungrouped</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16213e] text-[#333] dark:text-[#e0e0e0]">
            <option value="">All Types</option>
            <option value="competitor">🏢 Competitor</option>
            <option value="trend">📈 Trend</option>
            <option value="industry">🏭 Industry</option>
          </select>
          {(filterName || filterGroup || filterType) && (
            <button onClick={() => { setFilterName(''); setFilterGroup(''); setFilterType(''); }}
              className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Clear</button>
          )}
          <span className="text-gray-400 ml-auto">{filteredTopics.length} / {topics.length} topics</span>
        </div>

        {/* Bulk Actions Bar */}
        {editMode && selectedTopics.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{selectedTopics.size} selected</span>
            <select onChange={e => { if (e.target.value) bulkUpdateField('topic_group', e.target.value === '__none__' ? null : e.target.value); e.target.value = ''; }}
              className="px-2 py-1 text-xs rounded border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Set Group...</option>
              {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="__none__">Remove Group</option>
            </select>
            <select onChange={e => { if (e.target.value) bulkUpdateField('topic_type', e.target.value); e.target.value = ''; }}
              className="px-2 py-1 text-xs rounded border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Set Type...</option>
              <option value="competitor">Competitor</option>
              <option value="trend">Trend</option>
              <option value="industry">Industry</option>
            </select>
            <select onChange={e => { if (e.target.value) bulkUpdateField('report_days', parseInt(e.target.value)); e.target.value = ''; }}
              className="px-2 py-1 text-xs rounded border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Set Period...</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
            <button onClick={() => setSelectedTopics(new Set())}
              className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 ml-auto">Deselect</button>
          </div>
        )}
      </div>

      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm">
          {message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#16213e] rounded-xl h-48" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Results */}
            {searchResults !== null && (
              <div className="bg-white dark:bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-200/50 dark:border-gray-700/50">
                <h3 className="font-semibold text-[#333] dark:text-[#e0e0e0] mb-3">
                  🔍 Search: &quot;{searchQuery}&quot; — {searchResults.length} results
                </h3>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No articles found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                    {searchResults.map((item: any, i: number) => (
                      <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/30 group block">
                        <p className="text-xs text-[#333] dark:text-[#e0e0e0] group-hover:text-blue-600 line-clamp-2">
                          {item.sentiment && <span className="mr-1">{SENTIMENT_ICONS[item.sentiment]}</span>}
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                          {item.language && <span>{LANG_FLAGS[item.language] || '🌐'}</span>}
                          <span className="text-blue-500">{item.topic_name}</span>
                          {item.source_name && <span>{item.source_name}</span>}
                          {item.published_at && <span>{timeAgo(item.published_at)}</span>}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Competitor Comparison */}
            {showCompare && (
              <div className="bg-white dark:bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-semibold text-[#333] dark:text-[#e0e0e0]">📋 Comparison (last 7 days)</h3>
                  <div className="flex gap-1 items-center">
                    {['competitor', 'trend', 'industry'].map(t => (
                      <button key={t} onClick={() => { setCompareType(t); loadComparison(t); }}
                        className={`px-2 py-1 text-xs rounded ${compareType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                        {TYPE_ICONS[t]} {t}
                      </button>
                    ))}
                    {compareData.length > 0 && (
                      <button onClick={exportCSV}
                        className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200" title="Export CSV">
                        📥 CSV
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-500">Name</th>
                        <th className="text-center py-2 px-1 text-gray-500">Mentions</th>
                        <th className="text-center py-2 px-1 text-gray-500">SoV</th>
                        <th className="text-center py-2 px-1 text-gray-500">Trend</th>
                        <th className="text-center py-2 px-1 text-gray-500">🟢</th>
                        <th className="text-center py-2 px-1 text-gray-500">🟡</th>
                        <th className="text-center py-2 px-1 text-gray-500">🔴</th>
                        <th className="text-center py-2 px-1 text-gray-500">Sentiment</th>
                        <th className="text-center py-2 px-1 text-gray-500">Quality</th>
                        <th className="text-left py-2 px-2 text-gray-500">Tags</th>
                        <th className="text-right py-2 px-2 text-gray-500">Latest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareData.map((row: any) => {
                        const trend = row.trend_pct || 0;
                        const sentScore = row.sentiment_score || 0;
                        return (
                        <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-1.5 px-2 font-medium text-[#333] dark:text-[#e0e0e0]">{row.name}</td>
                          <td className="text-center py-1.5 px-1 font-bold">{row.total_mentions}</td>
                          <td className="text-center py-1.5 px-1">
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(row.share_of_voice || 0, 100)}%` }} />
                              </div>
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{row.share_of_voice || 0}%</span>
                            </div>
                          </td>
                          <td className="text-center py-1.5 px-1">
                            <span className={`text-[10px] font-bold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {trend > 0 ? `↑${trend}%` : trend < 0 ? `↓${Math.abs(trend)}%` : '—'}
                            </span>
                          </td>
                          <td className="text-center py-1.5 px-1 text-green-600">{row.positive || 0}</td>
                          <td className="text-center py-1.5 px-1 text-yellow-600">{row.neutral || 0}</td>
                          <td className="text-center py-1.5 px-1 text-red-600">{row.negative || 0}</td>
                          <td className="text-center py-1.5 px-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              sentScore > 20 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : sentScore < -20 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>{sentScore > 0 ? '+' : ''}{sentScore}</span>
                          </td>
                          <td className="text-center py-1.5 px-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              (row.quality_score || 0) > 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>{Math.round(row.quality_score || 0)}</span>
                          </td>
                          <td className="py-1.5 px-2">
                            {(row.top_tags || []).slice(0, 3).map((tag: string) => (
                              <span key={tag} className="inline-block mr-1 px-1 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[9px]">{tag}</span>
                            ))}
                          </td>
                          <td className="text-right py-1.5 px-2 text-gray-400">{row.latest_article ? timeAgo(row.latest_article) : '—'}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Keyword Cloud */}
            {showKeywords && (
              <div className="bg-white dark:bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#333] dark:text-[#e0e0e0]">☁️ Keyword Cloud (14 days)</h3>
                  <div className="flex gap-1">
                    <button onClick={() => loadKeywords()}
                      className={`px-2 py-1 text-xs rounded ${!keywordsTopicId ? 'bg-cyan-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      All Topics
                    </button>
                    {topics.slice(0, 8).map(t => (
                      <button key={t.id} onClick={() => loadKeywords(t.id)}
                        className={`px-2 py-1 text-xs rounded truncate max-w-[80px] ${keywordsTopicId === t.id ? 'bg-cyan-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center py-4">
                  {keywordsData.map((kw, i) => {
                    const maxCount = keywordsData[0]?.count || 1;
                    const ratio = kw.count / maxCount;
                    const size = Math.max(11, Math.round(10 + ratio * 24));
                    const opacity = Math.max(0.4, ratio);
                    return (
                      <span key={kw.word} style={{ fontSize: `${size}px`, opacity }}
                        className={`px-1.5 py-0.5 rounded cursor-default transition-colors hover:bg-cyan-100 dark:hover:bg-cyan-900/30 ${
                          i < 5 ? 'text-cyan-700 dark:text-cyan-400 font-bold' :
                          i < 15 ? 'text-blue-600 dark:text-blue-400 font-medium' :
                          'text-gray-500 dark:text-gray-400'
                        }`}
                        title={`${kw.count} mentions`}>
                        {kw.word}
                      </span>
                    );
                  })}
                  {keywordsData.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No keyword data available.</p>
                  )}
                </div>
              </div>
            )}

            {/* Cross-topic Correlation */}
            {showCorrelation && (
              <div className="bg-white dark:bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-200/50 dark:border-gray-700/50">
                <h3 className="font-semibold text-[#333] dark:text-[#e0e0e0] mb-3">🔗 Cross-topic Correlation (shared sources, 14 days)</h3>
                {correlationData.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No significant correlations found.</p>
                ) : (
                  <div className="space-y-2">
                    {correlationData.map((corr: any, i: number) => {
                      const maxShared = Number(correlationData[0]?.shared_sources) || 1;
                      const barWidth = Math.max(5, Math.round((Number(corr.shared_sources) / maxShared) * 100));
                      return (
                        <div key={`${corr.topic1_id}-${corr.topic2_id}`} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-right font-medium text-[#333] dark:text-[#e0e0e0] truncate" title={corr.topic1_name}>
                            {corr.topic1_name}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 dark:bg-amber-600 rounded-full transition-all"
                                style={{ width: `${barWidth}%` }} />
                            </div>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 w-8 text-center">{corr.shared_sources}</span>
                          </div>
                          <div className="w-32 text-xs font-medium text-[#333] dark:text-[#e0e0e0] truncate" title={corr.topic2_name}>
                            {corr.topic2_name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Topic Blocks with group dividers */}
            {filteredTopics.flatMap((topic, idx) => {
              const items = topicItems[topic.id] || [];
              const prevGroup = idx > 0 ? filteredTopics[idx - 1].topic_group : undefined;
              const elements: React.ReactNode[] = [];
              // Insert group divider when group changes
              if (topic.topic_group && topic.topic_group !== prevGroup) {
                const groupName = topic.topic_group;
                const isCollapsed = collapsedGroups.has(groupName);
                elements.push(
                  <div key={`group-${groupName}`} className="flex items-center gap-2 px-1 cursor-pointer select-none" onClick={() => toggleGroup(groupName)}>
                    <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="text-[10px]">{isCollapsed ? '▶' : '▼'}</span> {groupName}
                      <span className="font-normal text-gray-400">({filteredTopics.filter(t => t.topic_group === groupName).length})</span>
                    </span>
                    <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
                  </div>
                );
              }
              // Skip rendering if group is collapsed
              if (topic.topic_group && collapsedGroups.has(topic.topic_group)) {
                return elements;
              }
              elements.push(
                <div key={topic.id}
                  draggable={editMode}
                  onDragStart={() => handleDragStart(topic.id)}
                  onDragOver={(e) => handleDragOver(e, topic.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white dark:bg-[#16213e] rounded-xl overflow-hidden border transition-all ${
                    dragOverId === topic.id ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' :
                    dragId === topic.id ? 'opacity-50 border-gray-300 dark:border-gray-600' :
                    'border-gray-200/50 dark:border-gray-700/50'
                  } ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                  {/* Topic Header */}
                  <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-gray-50 dark:bg-[#1a1a3e] border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {editMode && (
                        <input type="checkbox" checked={selectedTopics.has(topic.id)}
                          onChange={() => toggleSelect(topic.id)}
                          className="w-4 h-4 rounded border-gray-300 shrink-0" />
                      )}
                      {editMode && <span className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0">⠿</span>}
                      <span className="text-xl sm:text-2xl shrink-0">{TYPE_ICONS[topic.topic_type] || '📊'}</span>
                      <div>
                        <h2 className="font-bold text-[#333] dark:text-[#e0e0e0]">{topic.name}</h2>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                          <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {TYPE_LABELS[topic.topic_type] || topic.topic_type}
                          </span>
                          <span>{(topic.keywords || []).join(', ')}</span>
                          <span>🌐 {(topic.search_langs || []).join('+').toUpperCase()}</span>
                          {(topic.extra_sources || []).length > 0 && (
                            <span>📡 {topic.extra_sources.length} sources</span>
                          )}
                          {topic.updated_at && <span>Updated {timeAgo(topic.updated_at)}</span>}
                        </div>
                      </div>
                      {/* Sparkline */}
                      {sparklines[topic.id] && sparklines[topic.id].some(v => v > 0) && (
                        <div className="ml-auto shrink-0" title="Articles per day (30 days)">
                          <Sparkline data={sparklines[topic.id]} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => searchTopic(topic.id)} disabled={searchingTopic === topic.id}
                        className="px-2.5 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 disabled:opacity-50 transition-colors">
                        {searchingTopic === topic.id ? '⏳...' : '🔍 Search'}
                      </button>
                      <button onClick={() => generateReport(topic.id)} disabled={generatingReport !== null}
                        className="px-2.5 py-1 text-xs rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 disabled:opacity-50 transition-colors">
                        {generatingReport === topic.id ? '🤖...' : '🤖 Report'}
                      </button>
                      <button onClick={() => viewReport(topic.id)}
                        className={`px-2.5 py-1 text-xs rounded transition-colors ${
                          activeReportTopic === topic.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                        }`}>
                        📄 View
                      </button>
                      {editMode && (
                        <>
                          <button onClick={() => {
                            setEditingSources(editingSources === topic.id ? null : topic.id);
                            setSourcesInput((topic.extra_sources || []).join('\n'));
                          }}
                            className="px-2.5 py-1 text-xs rounded bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                            📡 Sources
                          </button>
                          <span className="text-[10px] text-gray-400 font-mono">#{idx + 1}</span>
                          <button onClick={() => moveTopic(topic.id, 'up')} disabled={idx === 0}
                            className="w-7 h-7 flex items-center justify-center text-xs bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Move up">▲</button>
                          <button onClick={() => moveTopic(topic.id, 'down')} disabled={idx === topics.length - 1}
                            className="w-7 h-7 flex items-center justify-center text-xs bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Move down">▼</button>
                          <button onClick={() => deleteTopic(topic.id)}
                            className="w-7 h-7 flex items-center justify-center text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors" title="Delete">✕</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sources Editor */}
                  {editingSources === topic.id && (
                    <div className="px-5 py-3 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-200 dark:border-yellow-800/30">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                        RSS feeds or website URLs (one per line). Websites without RSS will be scraped for article links.
                      </p>
                      <textarea value={sourcesInput} onChange={e => setSourcesInput(e.target.value)}
                        placeholder="https://competitor.com/blog/rss&#10;https://competitor.com/news&#10;https://industry-blog.com/feed"
                        rows={4} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono" />
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                          Report period:
                          <input type="number" min={1} max={365} defaultValue={topic.report_days || 30}
                            id={`report-days-${topic.id}`}
                            className="w-16 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          /> days
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                          Group:
                          <input type="text" defaultValue={topic.topic_group || ''}
                            id={`topic-group-${topic.id}`}
                            placeholder="DSP, SSP, Agency..."
                            className="w-28 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </label>
                        <button onClick={() => {
                          const daysEl = document.getElementById(`report-days-${topic.id}`) as HTMLInputElement;
                          const groupEl = document.getElementById(`topic-group-${topic.id}`) as HTMLInputElement;
                          const d = parseInt(daysEl?.value || '30', 10);
                          saveSources(topic.id, d, groupEl?.value);
                        }}
                          className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">Save</button>
                        <button onClick={() => setEditingSources(null)}
                          className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Articles Grid */}
                  <div className="p-3 sm:p-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                        No articles yet. Click 🔍 Search to fetch news.
                      </p>
                    ) : (
                      <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map((item: any, i: number) => (
                          <div key={item.id || i}
                            className="p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 font-mono shrink-0">[{i+1}]</span>
                              <div className="flex-1 min-w-0">
                                <a href={item.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-[#333] dark:text-[#e0e0e0] group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 block leading-snug">
                                  {item.sentiment && <span className="mr-0.5" title={item.sentiment}>{SENTIMENT_ICONS[item.sentiment]}</span>}
                                  {translations[item.id]?.title || item.title}
                                </a>
                                {translations[item.id] && (
                                  <p className="text-[10px] text-gray-400 mt-0.5 italic line-clamp-1">
                                    {item.title}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {item.language && (
                                    <span className="text-[10px]">{LANG_FLAGS[item.language] || '🌐'}</span>
                                  )}
                                  {item.source_name && (
                                    <span className="text-[10px] text-blue-500 dark:text-blue-400 truncate max-w-[80px]">{item.source_name}</span>
                                  )}
                                  {item.published_at && (
                                    <span className="text-[10px] text-gray-400">{timeAgo(item.published_at)}</span>
                                  )}
                                  {!translations[item.id] && (
                                    <span className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                      {['ru', 'pl'].map(lang => (
                                        <button key={lang}
                                          onClick={() => translateItem(item.id, item.title, lang)}
                                          disabled={translatingItem === item.id}
                                          className="text-[9px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50"
                                          title={`Translate to ${LANG_NAMES[lang]}`}>
                                          {translatingItem === item.id ? '..' : LANG_FLAGS[lang]}
                                        </button>
                                      ))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Load More */}
                      {items.length >= (topicLimits[topic.id] || 15) && (
                        <div className="text-center pt-2">
                          <button onClick={() => loadMoreItems(topic.id)}
                            className="px-4 py-1.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Load More ({items.length} shown)
                          </button>
                        </div>
                      )}
                      </>
                    )}
                  </div>

                  {/* AI Report Panel (expandable) */}
                  {activeReportTopic === topic.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-purple-50/30 dark:bg-purple-900/10 px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                          🤖 AI Analysis — {topic.name}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => generateReport(topic.id)} disabled={generatingReport !== null}
                            className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                            {generatingReport === topic.id ? '⏳ Generating...' : '🔄 New Report'}
                          </button>
                          {activeReport && (
                            <button onClick={() => exportReportPDF(topic.name, activeReport)}
                              className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300" title="Export PDF">
                              📄 PDF
                            </button>
                          )}
                        </div>
                      </div>

                      {generatingReport === topic.id && !activeReport && (
                        <div className="text-center py-8">
                          <div className="animate-spin text-3xl mb-2">🤖</div>
                          <p className="text-sm text-gray-500">Analyzing... (15-30 sec)</p>
                        </div>
                      )}

                      {activeReport && (
                        <div className="prose prose-sm dark:prose-invert max-w-none max-h-[500px] overflow-y-auto">
                          <div className="text-sm text-[#333] dark:text-[#d0d0d0] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderReport(activeReport) }} />
                        </div>
                      )}

                      {!activeReport && generatingReport !== topic.id && (
                        <p className="text-sm text-gray-400 italic text-center py-6">
                          No report yet. Click &quot;New Report&quot; to generate.
                        </p>
                      )}

                      {reportHistory.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-purple-200/30 dark:border-purple-800/30">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase">History</h4>
                            <button onClick={() => loadReportDiff(topic.id)}
                              className="px-2 py-0.5 text-[10px] rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200">
                              📊 Diff
                            </button>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {reportHistory.map((r, i) => (
                              <button key={r.id} onClick={() => setActiveReport(r.content)}
                                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                                  activeReport === r.content
                                    ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                                }`}>
                                #{reportHistory.length - i} — {new Date(r.created_at).toLocaleDateString()}
                              </button>
                            ))}
                          </div>
                          {/* Report Diff */}
                          {reportDiffData[topic.id] && (
                            <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg text-xs">
                              <p className="text-orange-700 dark:text-orange-400 font-medium mb-1">
                                Changes: {new Date(reportDiffData[topic.id].previous_date).toLocaleDateString()} → {new Date(reportDiffData[topic.id].current_date).toLocaleDateString()}
                              </p>
                              {reportDiffData[topic.id].changes.map((ch: any, ci: number) => (
                                <div key={ci} className="flex items-start gap-2 py-1 border-t border-orange-200/30 dark:border-orange-800/30">
                                  <span className={`shrink-0 px-1 py-0.5 rounded text-[9px] font-bold ${
                                    ch.status === 'new' ? 'bg-green-200 text-green-800' :
                                    ch.status === 'removed' ? 'bg-red-200 text-red-800' :
                                    'bg-yellow-200 text-yellow-800'
                                  }`}>{ch.status.toUpperCase()}</span>
                                  <span className="text-gray-600 dark:text-gray-400">{ch.section}</span>
                                </div>
                              ))}
                              {reportDiffData[topic.id].changes.length === 0 && (
                                <p className="text-gray-400 italic">No structural changes between reports.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              return elements;
            })}

            {/* Add Topic */}
            {editMode && (
              showAdd ? (
                <div className="bg-white dark:bg-[#16213e] rounded-xl p-5 border-2 border-dashed border-blue-300 dark:border-blue-700 space-y-3">
                  <h3 className="font-semibold text-[#333] dark:text-[#e0e0e0]">Add Topic</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Name (e.g. DSP Platforms, The Trade Desk)" value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="px-3 py-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" placeholder="Keywords, comma-separated (DSP, demand-side platform)" value={addForm.keywords}
                      onChange={e => setAddForm({ ...addForm, keywords: e.target.value })}
                      className="px-3 py-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select value={addForm.topic_type} onChange={e => setAddForm({ ...addForm, topic_type: e.target.value })}
                      className="px-3 py-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="trend">📈 Trend</option>
                      <option value="competitor">🏢 Competitor</option>
                      <option value="industry">🏭 Industry</option>
                    </select>
                    <select value={addForm.search_langs} onChange={e => setAddForm({ ...addForm, search_langs: e.target.value })}
                      className="px-3 py-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="en,ru">🌐 EN + RU</option>
                      <option value="en">🇬🇧 English only</option>
                      <option value="ru">🇷🇺 Russian only</option>
                    </select>
                  </div>
                  <textarea placeholder="RSS or website URLs (one per line, optional)&#10;https://competitor.com/blog/rss&#10;https://competitor.com/news"
                    value={addForm.extra_sources} onChange={e => setAddForm({ ...addForm, extra_sources: e.target.value })}
                    rows={3} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono" />
                  <div className="flex gap-2">
                    <button onClick={addTopic} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Topic</button>
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)}
                  className="w-full bg-white/50 dark:bg-[#16213e]/50 rounded-xl p-6 flex items-center justify-center gap-2
                             border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors">
                  <span className="text-3xl text-gray-300 dark:text-gray-600">+</span>
                  <span className="text-sm text-gray-400">Add Topic</span>
                </button>
              )
            )}

            {topics.length === 0 && !editMode && (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔭</p>
                <p className="text-xl text-gray-500 dark:text-gray-400">No topics configured yet.</p>
                <p className="text-sm text-gray-400 mt-2">Enable edit mode to add competitors, trends, and industries to monitor.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        <p>Powered by <a href="https://web.icoffio.com" className="underline hover:text-gray-600">icoffio</a></p>
      </footer>
    </div>
  );
}
