'use client';

/**
 * TranslationQC — admin spot-check of GPT translations + one-click reset.
 * v10.17.0. Loads recent translated items side-by-side (source vs translation),
 * flags suspicious rows (identical / length-outlier), lets admin reset selected
 * rows so the translate cron re-does them.
 */

import { useState, useCallback } from 'react';

interface QCEntry {
  id: number;
  source: string;
  translated: string;
  feed_title: string;
  published_at: string | null;
  identical: boolean;
  suspicious: boolean;
}

export function TranslationQC() {
  const [lang, setLang] = useState<'pl' | 'en'>('pl');
  const [field, setField] = useState<'title' | 'description'>('title');
  const [entries, setEntries] = useState<QCEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [suspiciousCount, setSuspiciousCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    setSelected(new Set());
    try {
      const res = await fetch(`/api/admin/info/translation-qc?lang=${lang}&field=${field}&limit=50`);
      const data = await res.json();
      if (data.ok) {
        setEntries(data.entries);
        setSuspiciousCount(data.suspiciousCount);
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
    setLoading(false);
  }, [lang, field]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllSuspicious = () => {
    setSelected(new Set(entries.filter((e) => e.suspicious).map((e) => e.id)));
  };

  const resetSelected = async () => {
    if (selected.size === 0) { setMsg('Nothing selected'); return; }
    if (!confirm(`Reset ${selected.size} translation(s)? They'll be re-translated by the next cron run / batch.`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/info/translation-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', ids: Array.from(selected), field, target: lang }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(`✅ Reset ${data.reset} translations. Re-run "📰 Items → ${lang.toUpperCase()}" or wait for cron.`);
        load();
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg p-4 mt-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold">🔍 Translation QC</h2>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'pl' | 'en')}
            className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
          <select
            value={field}
            onChange={(e) => setField(e.target.value as 'title' | 'description')}
            className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="title">Titles</option>
            <option value="description">Descriptions</option>
          </select>
          <button onClick={load} disabled={loading}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? '…' : 'Load sample'}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
          <span className="text-gray-500">{entries.length} loaded, {suspiciousCount} suspicious</span>
          <button onClick={selectAllSuspicious}
            className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
            Select suspicious ({suspiciousCount})
          </button>
          <button onClick={resetSelected} disabled={selected.size === 0 || loading}
            className="px-2 py-0.5 rounded bg-red-600 text-white text-xs disabled:opacity-50 ml-auto">
            🔄 Reset selected ({selected.size})
          </button>
        </div>
      )}

      {msg && <div className="mb-2 p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded">{msg}</div>}

      {entries.length > 0 && (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {entries.map((e) => (
            <label
              key={e.id}
              className={`flex items-start gap-2 p-2 rounded cursor-pointer text-xs border ${
                e.suspicious
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-gray-400">{e.feed_title} · #{e.id}{e.identical ? ' · ⚠️ identical' : e.suspicious ? ' · ⚠️ length-outlier' : ''}</div>
                <div className="text-gray-600 dark:text-gray-400 line-clamp-2">src: {e.source}</div>
                <div className="text-gray-900 dark:text-gray-100 line-clamp-2">{lang}: {e.translated}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
