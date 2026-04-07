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
  const [reportLang, setReportLang] = useState<string>('ru');
  const [translatingItem, setTranslatingItem] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, { title: string }>>({});

  // Sources editor
  const [editingSources, setEditingSources] = useState<number | null>(null);
  const [sourcesInput, setSourcesInput] = useState('');

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

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
      const ok = (data.results || []).filter((r: any) => r.ok).length;
      const fail = (data.results || []).filter((r: any) => !r.ok).length;
      flash(`Generated ${ok} reports${fail ? `, ${fail} failed` : ''}`);
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
    await fetch(`/api/info/watch/topics?id=${id}`, { method: 'DELETE' });
    flash('Topic deleted');
    loadTopics();
  };

  const moveTopic = async (id: number, direction: 'up' | 'down') => {
    const idx = topics.findIndex(t => t.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= topics.length) return;
    await Promise.all([
      fetch('/api/info/watch/topics', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topics[idx].id, sort_order: topics[swapIdx].sort_order }),
      }),
      fetch('/api/info/watch/topics', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topics[swapIdx].id, sort_order: topics[idx].sort_order }),
      }),
    ]);
    loadTopics();
  };

  const saveSources = async (topicId: number) => {
    const sources = sourcesInput.split('\n').map(s => s.trim()).filter(Boolean);
    await fetch('/api/info/watch/topics', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: topicId, extra_sources: sources }),
    });
    setEditingSources(null);
    flash('Sources saved!');
    loadTopics();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/en/info" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            &larr; infomate
          </Link>
          <h1 className="text-2xl font-bold text-[#333] dark:text-[#e0e0e0]">Market Watch</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Report language */}
          <div className="flex items-center gap-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
            {['ru', 'pl', 'en'].map(lang => (
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
          {/* Generate All Reports */}
          <button
            onClick={generateAllReports}
            disabled={generatingReport !== null}
            className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {generatingReport === 'all' ? '🤖 Generating All...' : '🤖 All Reports'}
          </button>
          {isAdmin && (
            <>
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
          <InfoThemeToggle />
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm">
          {message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-4">
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#16213e] rounded-xl h-48" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Topic Blocks — like news feed */}
            {topics.map((topic, idx) => {
              const items = topicItems[topic.id] || [];
              return (
                <div key={topic.id} className="bg-white dark:bg-[#16213e] rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                  {/* Topic Header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-[#1a1a3e] border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{TYPE_ICONS[topic.topic_type] || '📊'}</span>
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
                          <button onClick={() => moveTopic(topic.id, 'up')} disabled={idx === 0}
                            className="w-6 h-6 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full disabled:opacity-30">▲</button>
                          <button onClick={() => moveTopic(topic.id, 'down')} disabled={idx === topics.length - 1}
                            className="w-6 h-6 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full disabled:opacity-30">▼</button>
                          <button onClick={() => deleteTopic(topic.id)}
                            className="w-6 h-6 flex items-center justify-center text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700">✕</button>
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
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => saveSources(topic.id)}
                          className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">Save Sources</button>
                        <button onClick={() => setEditingSources(null)}
                          className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Articles Grid */}
                  <div className="p-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                        No articles yet. Click 🔍 Search to fetch news.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map((item: any, i: number) => (
                          <div key={item.id || i}
                            className="p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 font-mono shrink-0">[{i+1}]</span>
                              <div className="flex-1 min-w-0">
                                <a href={item.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-[#333] dark:text-[#e0e0e0] group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 block leading-snug">
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
                    )}
                  </div>

                  {/* AI Report Panel (expandable) */}
                  {activeReportTopic === topic.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-purple-50/30 dark:bg-purple-900/10 px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                          🤖 AI Analysis — {topic.name}
                        </h3>
                        <button onClick={() => generateReport(topic.id)} disabled={generatingReport !== null}
                          className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                          {generatingReport === topic.id ? '⏳ Generating...' : '🔄 New Report'}
                        </button>
                      </div>

                      {generatingReport === topic.id && !activeReport && (
                        <div className="text-center py-8">
                          <div className="animate-spin text-3xl mb-2">🤖</div>
                          <p className="text-sm text-gray-500">Analyzing with GPT-5.4... (15-30 sec)</p>
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
                          <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase">History</h4>
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
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
        <p>Powered by <a href="https://web.icoffio.com" className="underline hover:text-gray-600">icoffio</a> & GPT-5.4</p>
      </footer>
    </div>
  );
}
