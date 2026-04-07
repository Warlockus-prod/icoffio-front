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

// Simple markdown-like renderer for AI reports
function renderReport(content: string): string {
  return content
    // Headers
    .replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-[#333] dark:text-[#e0e0e0]">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold mt-3 mb-1 text-[#333] dark:text-[#e0e0e0]">$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Citations [1], [2] etc
    .replace(/\[(\d+)\]/g, '<span class="text-blue-600 dark:text-blue-400 text-xs font-medium">[$1]</span>')
    // Bullet points
    .replace(/^[-•] (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="list-disc mb-3">$1</ul>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mb-2">')
    // Single newlines
    .replace(/\n/g, '<br/>');
}

export function InfoWatchPage() {
  const [topics, setTopics] = useState<WatchTopicFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState('');

  // Add topic form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', keywords: '', topic_type: 'trend', search_langs: 'en,ru',
  });

  // Expanded topic (show articles + report)
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<WatchReport[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [searchingTopic, setSearchingTopic] = useState<number | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch('/api/info/watch/topics');
      const data = await res.json();
      const topicsRaw = data.topics || [];

      // Load items for each topic
      const enriched: WatchTopicFull[] = [];
      for (const t of topicsRaw) {
        // Quick items count — we'll load full data when expanded
        enriched.push({ ...t, items: [], latest_report: null, item_count: 0 });
      }
      setTopics(enriched);
    } catch (err) {
      console.error('Failed to load topics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  useEffect(() => {
    // Check admin via API (cookie-based auth)
    fetch('/api/admin/auth', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.authenticated) setIsAdmin(true); })
      .catch(() => {});
    // Fallback: localStorage check
    try {
      const session = localStorage.getItem('admin_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.token && parsed.expires > Date.now()) setIsAdmin(true);
      }
    } catch {}
  }, []);

  // Load topic details when expanded
  const expandTopic = async (topicId: number) => {
    if (expandedId === topicId) {
      setExpandedId(null);
      setActiveReport(null);
      setReportHistory([]);
      return;
    }
    setExpandedId(topicId);
    setActiveReport(null);
    setReportHistory([]);

    // Load items via search (fetches + returns)
    try {
      const [itemsRes, reportsRes] = await Promise.all([
        fetch('/api/info/watch/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic_id: topicId }),
        }),
        fetch(`/api/info/watch/report?topic_id=${topicId}&limit=5`),
      ]);

      const reportsData = await reportsRes.json();
      setReportHistory(reportsData.reports || []);
      if (reportsData.reports?.length > 0) {
        setActiveReport(reportsData.reports[0].content);
      }

      // Reload topic items
      await loadTopicItems(topicId);
    } catch (err) {
      console.error('Failed to expand topic', err);
    }
  };

  const loadTopicItems = async (topicId: number) => {
    // Reload all topics to get fresh item counts
    try {
      const res = await fetch('/api/info/watch/topics');
      const data = await res.json();
      setTopics(prev => prev.map(t => {
        const fresh = (data.topics || []).find((ft: any) => ft.id === t.id);
        return fresh ? { ...t, ...fresh } : t;
      }));
    } catch {}
  };

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
      await loadTopicItems(topicId);
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
      await loadTopics();
    } catch (err: any) {
      flash(`Error: ${err.message}`);
    } finally {
      setFetchingAll(false);
    }
  };

  const generateReport = async (topicId: number) => {
    setGeneratingReport(true);
    try {
      const res = await fetch('/api/info/watch/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const data = await res.json();
      if (data.report) {
        setActiveReport(data.report);
        // Refresh history
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
      setGeneratingReport(false);
    }
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
          sort_order: (topics.length + 1) * 10,
        }),
      });
      setAddForm({ name: '', keywords: '', topic_type: 'trend', search_langs: 'en,ru' });
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
    if (expandedId === id) { setExpandedId(null); setActiveReport(null); }
    loadTopics();
  };

  const moveTopic = async (id: number, direction: 'up' | 'down') => {
    const idx = topics.findIndex(t => t.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= topics.length) return;

    await Promise.all([
      fetch('/api/info/watch/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topics[idx].id, sort_order: topics[swapIdx].sort_order }),
      }),
      fetch('/api/info/watch/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topics[swapIdx].id, sort_order: topics[idx].sort_order }),
      }),
    ]);
    loadTopics();
  };

  // Expanded topic items (loaded separately)
  const [expandedItems, setExpandedItems] = useState<any[]>([]);

  useEffect(() => {
    if (!expandedId) { setExpandedItems([]); return; }
    // Fetch items for expanded topic via a simple GET
    fetch(`/api/info/watch/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: expandedId }),
    }).then(() => {
      // Now get the items from DB
      const pool_fetch = async () => {
        const res = await fetch(`/api/info/watch/items?topic_id=${expandedId}`);
        const data = await res.json();
        setExpandedItems(data.items || []);
      };
      pool_fetch();
    });
  }, [expandedId]);

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/en/info" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            &larr; infomate
          </Link>
          <h1 className="text-2xl font-bold text-[#333] dark:text-[#e0e0e0]">
            Market Watch
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && editMode && (
            <button
              onClick={fetchAllTopics}
              disabled={fetchingAll}
              className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {fetchingAll ? '⏳ Fetching...' : '🔄 Fetch All'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                editMode
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {editMode ? '✏️ Editing' : '✏️ Edit'}
            </button>
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

      <main className="max-w-6xl mx-auto px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#16213e] rounded-xl h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Topics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {topics.map((topic, idx) => (
                <div
                  key={topic.id}
                  className={`relative bg-white dark:bg-[#16213e] rounded-xl p-4 cursor-pointer transition-all duration-200
                    border-2 ${expandedId === topic.id
                      ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                      : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md'
                    }`}
                  onClick={() => expandTopic(topic.id)}
                >
                  {/* Edit controls */}
                  {editMode && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10" onClick={e => e.stopPropagation()}>
                      <button onClick={() => moveTopic(topic.id, 'up')} disabled={idx === 0}
                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full hover:bg-gray-600 disabled:opacity-30">▲</button>
                      <button onClick={() => moveTopic(topic.id, 'down')} disabled={idx === topics.length - 1}
                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full hover:bg-gray-600 disabled:opacity-30">▼</button>
                      <button onClick={() => deleteTopic(topic.id)}
                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700">✕</button>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{TYPE_ICONS[topic.topic_type] || '📊'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#333] dark:text-[#e0e0e0] truncate">
                        {topic.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          {TYPE_LABELS[topic.topic_type] || topic.topic_type}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {(topic.keywords || []).slice(0, 3).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span>🌐 {(topic.search_langs || []).join(', ').toUpperCase()}</span>
                        {topic.updated_at && <span>Updated {timeAgo(topic.updated_at)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => searchTopic(topic.id)}
                      disabled={searchingTopic === topic.id}
                      className="flex-1 px-2 py-1.5 text-xs rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                    >
                      {searchingTopic === topic.id ? '⏳ Searching...' : '🔍 Search News'}
                    </button>
                    <button
                      onClick={() => { setExpandedId(topic.id); generateReport(topic.id); }}
                      disabled={generatingReport}
                      className="flex-1 px-2 py-1.5 text-xs rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50 transition-colors"
                    >
                      {generatingReport && expandedId === topic.id ? '🤖 Analyzing...' : '🤖 AI Report'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Topic Card */}
              {editMode && (
                showAdd ? (
                  <div className="bg-white dark:bg-[#16213e] rounded-xl p-4 border-2 border-dashed border-blue-300 dark:border-blue-700 space-y-2">
                    <input type="text" placeholder="Name (e.g. DSP Platforms)" value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" placeholder="Keywords (comma-separated)" value={addForm.keywords}
                      onChange={e => setAddForm({ ...addForm, keywords: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select value={addForm.topic_type}
                      onChange={e => setAddForm({ ...addForm, topic_type: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="trend">📈 Trend</option>
                      <option value="competitor">🏢 Competitor</option>
                      <option value="industry">🏭 Industry</option>
                    </select>
                    <select value={addForm.search_langs}
                      onChange={e => setAddForm({ ...addForm, search_langs: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="en,ru">🌐 EN + RU</option>
                      <option value="en">🇬🇧 English only</option>
                      <option value="ru">🇷🇺 Russian only</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={addTopic} className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                      <button onClick={() => setShowAdd(false)} className="flex-1 px-2 py-1.5 text-xs bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="bg-white/50 dark:bg-[#16213e]/50 rounded-xl p-4 flex flex-col items-center justify-center
                               border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors min-h-[120px]"
                  >
                    <span className="text-4xl text-gray-300 dark:text-gray-600 mb-2">+</span>
                    <span className="text-sm text-gray-400">Add Topic</span>
                  </button>
                )
              )}
            </div>

            {/* Expanded Topic Detail */}
            {expandedId && (
              <div className="bg-white dark:bg-[#16213e] rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#333] dark:text-[#e0e0e0]">
                    {topics.find(t => t.id === expandedId)?.name}
                  </h2>
                  <button onClick={() => { setExpandedId(null); setActiveReport(null); }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Articles */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      Recent Articles ({expandedItems.length})
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {expandedItems.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                          No articles yet. Click &quot;Search News&quot; to fetch.
                        </p>
                      ) : (
                        expandedItems.map((item: any, i: number) => (
                          <a
                            key={item.id || i}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-300 dark:text-gray-600 mt-0.5 font-mono">[{i + 1}]</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#333] dark:text-[#e0e0e0] group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.source_name && (
                                    <span className="text-xs text-blue-500 dark:text-blue-400">{item.source_name}</span>
                                  )}
                                  {item.published_at && (
                                    <span className="text-xs text-gray-400">{timeAgo(item.published_at)}</span>
                                  )}
                                  {item.language && (
                                    <span className="text-xs text-gray-300 dark:text-gray-600 uppercase">{item.language}</span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </a>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: AI Report */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        AI Analysis
                      </h3>
                      <button
                        onClick={() => generateReport(expandedId)}
                        disabled={generatingReport}
                        className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        {generatingReport ? '🤖 Generating...' : '🤖 Generate New Report'}
                      </button>
                    </div>

                    {generatingReport && !activeReport && (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin text-4xl mb-3">🤖</div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing articles with GPT-4o...</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This may take 15-30 seconds</p>
                        </div>
                      </div>
                    )}

                    {activeReport && (
                      <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto pr-2">
                        <div
                          className="text-sm text-[#333] dark:text-[#d0d0d0] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderReport(activeReport) }}
                        />
                      </div>
                    )}

                    {!activeReport && !generatingReport && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic py-8 text-center">
                        No report yet. Click &quot;Generate New Report&quot; for AI analysis.
                      </p>
                    )}

                    {/* Report History */}
                    {reportHistory.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Previous Reports</h4>
                        <div className="space-y-1">
                          {reportHistory.map((r, i) => (
                            <button
                              key={r.id}
                              onClick={() => setActiveReport(r.content)}
                              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                                activeReport === r.content
                                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              Report #{reportHistory.length - i} — {new Date(r.created_at).toLocaleString()} ({r.sources_count} sources)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {topics.length === 0 && !editMode && (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔭</p>
                <p className="text-xl text-gray-500 dark:text-gray-400">No topics configured yet.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Enable edit mode to add competitors, trends, and industries to monitor.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        <p>
          Powered by{' '}
          <a href="https://web.icoffio.com" className="underline hover:text-gray-600 dark:hover:text-gray-300">icoffio</a>
          {' '}& GPT-4o
        </p>
      </footer>
    </div>
  );
}
