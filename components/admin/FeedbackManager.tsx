'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────
interface FeedbackReport {
  id: number;
  description: string;
  category: string;
  screenshot_url: string | null;
  email: string | null;
  page_url: string;
  viewport_width: number | null;
  viewport_height: number | null;
  user_agent: string | null;
  color_scheme: string | null;
  locale: string | null;
  console_errors: string | string[];
  status: 'new' | 'in_progress' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackStats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  dismissed: number;
  new_this_week: number;
  by_category: Record<string, number>;
  critical: number;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ─── Constants ───────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  ui_issue: 'UI Issue',
  content_error: 'Content Error',
  feature_request: 'Feature Request',
  other: 'Other',
};

const CATEGORY_ICONS: Record<string, string> = {
  bug: '🐛',
  ui_issue: '🎨',
  content_error: '📝',
  feature_request: '💡',
  other: '📋',
};

// ─── Helper Functions ────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return opt || STATUS_OPTIONS[0];
}

function getPriorityBadge(priority: string) {
  const opt = PRIORITY_OPTIONS.find(o => o.value === priority);
  return opt || PRIORITY_OPTIONS[1];
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other';
}

// ─── Component ───────────────────────────────────────────
export default function FeedbackManager() {
  // Data state
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);

  // Edit state
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Debounced search ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feedback?stats_only=true');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('[FeedbackManager] Stats error:', err);
    }
  }, []);

  // ── Fetch Reports ──
  const fetchReports = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '20');
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (filterPriority) params.set('priority', filterPriority);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/admin/feedback?${params}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.data || []);
        setPagination(data.pagination || { page: 1, per_page: 20, total: 0, total_pages: 0 });
      }
    } catch (err) {
      console.error('[FeedbackManager] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterCategory, filterPriority, debouncedSearch]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchReports();
  }, [fetchStats, fetchReports]);

  // ── Update Report ──
  const updateReport = async (id: number, updates: { status?: string; priority?: string; admin_notes?: string }) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } as FeedbackReport : r));
        if (selectedReport?.id === id) {
          setSelectedReport(prev => prev ? { ...prev, ...updates } as FeedbackReport : null);
        }
        fetchStats();
      }
    } catch (err) {
      console.error('[FeedbackManager] Update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Bulk Actions ──
  const bulkAction = async (action: 'resolved' | 'dismissed') => {
    if (selectedIds.size === 0) return;
    setIsSaving(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch('/api/admin/feedback', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: action }),
        })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      fetchReports(pagination.page);
      fetchStats();
    } catch (err) {
      console.error('[FeedbackManager] Bulk action error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──
  const deleteReport = async (id: number) => {
    if (!window.confirm(`Delete feedback #${id}? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.filter(r => r.id !== id));
        if (selectedReport?.id === id) setSelectedReport(null);
        fetchStats();
      }
    } catch (err) {
      console.error('[FeedbackManager] Delete error:', err);
    }
  };

  // ── Toggle select ──
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  // ── Open detail ──
  const openDetail = (report: FeedbackReport) => {
    setSelectedReport(report);
    setEditNotes(report.admin_notes || '');
  };

  // Parse console errors
  const parseConsoleErrors = (errors: string | string[] | null): string[] => {
    if (!errors) return [];
    if (Array.isArray(errors)) return errors;
    try {
      const parsed = JSON.parse(errors);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Stats Bar ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total" value={stats.total} icon="📊" />
          <StatCard label="New" value={stats.new} icon="🆕" highlight={stats.new > 0} />
          <StatCard label="In Progress" value={stats.in_progress} icon="🔄" />
          <StatCard label="Resolved" value={stats.resolved} icon="✅" />
          <StatCard label="Dismissed" value={stats.dismissed} icon="🚫" />
          <StatCard label="This Week" value={stats.new_this_week} icon="📅" />
          <StatCard label="Critical" value={stats.critical} icon="🔴" highlight={stats.critical > 0} />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{CATEGORY_ICONS[val]} {label}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Refresh */}
          <button
            onClick={() => { fetchReports(pagination.page); fetchStats(); }}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            🔄
          </button>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => bulkAction('resolved')}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
            >
              ✅ Mark Resolved
            </button>
            <button
              onClick={() => bulkAction('dismissed')}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              🚫 Dismiss
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Reports Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <span className="text-4xl mb-3">🐛</span>
            <p className="text-sm">No feedback reports found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === reports.length && reports.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Screenshot</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.map((report) => {
                  const statusBadge = getStatusBadge(report.status);
                  const priorityBadge = getPriorityBadge(report.priority);
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                      onClick={() => openDetail(report)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(report.id)}
                          onChange={() => toggleSelect(report.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {report.screenshot_url ? (
                          <img
                            src={report.screenshot_url}
                            alt="Screenshot"
                            className="w-16 h-10 object-cover rounded border border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-16 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                            No img
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-900 dark:text-white truncate font-medium">
                          #{report.id} {report.description.substring(0, 80)}
                          {report.description.length > 80 ? '...' : ''}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {report.page_url}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {CATEGORY_ICONS[report.category] || '📋'} {CATEGORY_LABELS[report.category] || report.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {timeAgo(report.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchReports(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => fetchReports(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedReport(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Detail Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Feedback #{selectedReport.id}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Detail Body */}
            <div className="px-6 py-4 space-y-5">
              {/* Screenshot */}
              {selectedReport.screenshot_url && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Screenshot</label>
                  <a href={selectedReport.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedReport.screenshot_url}
                      alt="Feedback screenshot"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity cursor-zoom-in"
                    />
                  </a>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Description</label>
                <p className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedReport.description}
                </p>
              </div>

              {/* Status & Priority row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Status</label>
                  <select
                    value={selectedReport.status}
                    onChange={(e) => updateReport(selectedReport.id, { status: e.target.value })}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Priority</label>
                  <select
                    value={selectedReport.priority}
                    onChange={(e) => updateReport(selectedReport.id, { priority: e.target.value })}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Admin Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Add internal notes about this report..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {editNotes !== (selectedReport.admin_notes || '') && (
                  <button
                    onClick={() => updateReport(selectedReport.id, { admin_notes: editNotes })}
                    disabled={isSaving}
                    className="mt-2 px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Notes'}
                  </button>
                )}
              </div>

              {/* Metadata */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Metadata</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <MetaItem label="Page URL" value={selectedReport.page_url} isLink />
                  <MetaItem label="Category" value={`${CATEGORY_ICONS[selectedReport.category] || ''} ${CATEGORY_LABELS[selectedReport.category] || selectedReport.category}`} />
                  <MetaItem label="Viewport" value={selectedReport.viewport_width && selectedReport.viewport_height ? `${selectedReport.viewport_width}x${selectedReport.viewport_height}` : 'N/A'} />
                  <MetaItem label="Browser" value={parseBrowser(selectedReport.user_agent)} />
                  <MetaItem label="Theme" value={selectedReport.color_scheme || 'N/A'} />
                  <MetaItem label="Locale" value={selectedReport.locale || 'N/A'} />
                  <MetaItem label="Email" value={selectedReport.email || 'N/A'} />
                  <MetaItem label="Created" value={new Date(selectedReport.created_at).toLocaleString()} />
                  <MetaItem label="Updated" value={new Date(selectedReport.updated_at).toLocaleString()} />
                </div>
              </div>

              {/* Console Errors */}
              {parseConsoleErrors(selectedReport.console_errors).length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
                    Console Errors ({parseConsoleErrors(selectedReport.console_errors).length})
                  </label>
                  <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {parseConsoleErrors(selectedReport.console_errors).map((err, i) => (
                      <pre key={i} className="text-xs text-red-400 whitespace-pre-wrap mb-1">
                        {err}
                      </pre>
                    ))}
                  </div>
                </div>
              )}

              {/* Full User Agent */}
              {selectedReport.user_agent && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">User Agent</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg break-all">
                    {selectedReport.user_agent}
                  </p>
                </div>
              )}
            </div>

            {/* Detail Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => deleteReport(selectedReport.id)}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: boolean }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${
      highlight ? 'border-red-200 dark:border-red-800 ring-1 ring-red-100 dark:ring-red-900/30' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        <span className={`text-2xl font-bold ${highlight ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function MetaItem({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">{label}</p>
      {isLink && value !== 'N/A' ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
          title={value}
        >
          {value.replace(/^https?:\/\//, '').substring(0, 40)}{value.length > 50 ? '...' : ''}
        </a>
      ) : (
        <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={value}>{value}</p>
      )}
    </div>
  );
}
