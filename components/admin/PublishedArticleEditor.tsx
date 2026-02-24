'use client';

/**
 * PUBLISHED ARTICLE EDITOR v10.2.0
 *
 * WordPress-like editor for published articles.
 * Loads article from PostgreSQL, provides dual-language editing (EN/PL),
 * inline image replacement, and saves changes back to the database.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import RichTextEditor from './RichTextEditor';

// Regex to match the ICOFFIO monetization HTML comment
const MONETIZATION_COMMENT_RE = /^<!--\s*ICOFFIO_MONETIZATION\s+[\s\S]*?-->\s*/;

/**
 * Detect whether content is Markdown (not HTML).
 * Simple heuristic: if it has no HTML block-level tags but has Markdown headings or lists, it's Markdown.
 */
function isMarkdownContent(content: string): boolean {
  const stripped = content.replace(MONETIZATION_COMMENT_RE, '').trim();
  if (!stripped) return false;
  // Has HTML block tags? → it's HTML
  if (/<(p|div|h[1-6]|ul|ol|li|blockquote|table|section|article)\b/i.test(stripped)) return false;
  // Has Markdown syntax? → it's Markdown
  if (/^#{1,6}\s/m.test(stripped)) return true;  // headings
  if (/^\s*[-*+]\s/m.test(stripped)) return true; // unordered list
  if (/^\s*\d+\.\s/m.test(stripped)) return true; // ordered list
  if (/\*\*.+\*\*/m.test(stripped)) return true;  // bold
  // If it's plain text with newlines, treat as markdown for proper rendering
  if (stripped.includes('\n\n')) return true;
  return false;
}

/**
 * Prepare content for TipTap editor:
 * 1. Strip monetization comment (stored separately)
 * 2. Convert Markdown → HTML if needed
 */
function prepareContentForEditor(raw: string): { html: string; monetizationComment: string } {
  let monetizationComment = '';
  let content = raw || '';

  // Extract monetization comment
  const match = content.match(MONETIZATION_COMMENT_RE);
  if (match) {
    monetizationComment = match[0];
    content = content.slice(match[0].length).trim();
  }

  // Convert Markdown to HTML if needed
  if (isMarkdownContent(content)) {
    content = marked.parse(content, { async: false }) as string;
  }

  return { html: content, monetizationComment };
}

/**
 * Re-add monetization comment before saving back to DB
 */
function prepareContentForSave(html: string, monetizationComment: string): string {
  if (!monetizationComment) return html;
  return monetizationComment + html;
}

interface PublishedArticle {
  id: number;
  title: string;
  content_en: string;
  content_pl: string;
  excerpt_en: string;
  excerpt_pl: string;
  image_url: string;
  category: string;
  author: string;
  source_url?: string;
  created_at?: string;
  updated_at?: string;
  published?: boolean;
  tags?: string[];
}

interface PublishedArticleEditorProps {
  articleId: number;
  onClose: () => void;
  onSaved?: () => void;
}

const CATEGORIES = ['ai', 'apple', 'tech', 'games'];
const AUTO_SAVE_DELAY_MS = 5000;

export default function PublishedArticleEditor({
  articleId,
  onClose,
  onSaved,
}: PublishedArticleEditorProps) {
  const [article, setArticle] = useState<PublishedArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<'en' | 'pl'>('en');
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangesRef = useRef<Record<string, any>>({});

  // Polish title extracted from tags or content_pl H1
  const [polishTitle, setPolishTitle] = useState('');

  // Monetization comments preserved per-language (stripped for editing, re-added on save)
  const monetizationCommentsRef = useRef<{ en: string; pl: string }>({ en: '', pl: '' });

  // Load article
  useEffect(() => {
    const loadArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/supabase-articles?action=get-by-id&id=${articleId}`);
        const result = await res.json();
        if (result.success && result.article) {
          const a = result.article;

          // Prepare content: strip monetization comments, convert Markdown → HTML
          const enPrepared = prepareContentForEditor(a.content_en || '');
          const plPrepared = prepareContentForEditor(a.content_pl || '');

          monetizationCommentsRef.current = {
            en: enPrepared.monetizationComment,
            pl: plPrepared.monetizationComment,
          };

          // Store article with clean HTML content for the editor
          setArticle({
            ...a,
            content_en: enPrepared.html,
            content_pl: plPrepared.html,
          });

          // Extract Polish title from tags[0] or content_pl H1
          let plTitle = '';
          if (a.tags && a.tags.length > 0) {
            plTitle = a.tags[0];
          }
          if (!plTitle && a.content_pl) {
            const h1Match = a.content_pl.match(/^#\s+(.+)/m);
            if (h1Match) plTitle = h1Match[1];
          }
          setPolishTitle(plTitle);
        } else {
          setError(result.error || 'Failed to load article');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };
    loadArticle();
  }, [articleId]);

  // Auto-save
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveArticle();
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const updateField = useCallback(
    (field: keyof PublishedArticle, value: any) => {
      setArticle((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
      pendingChangesRef.current[field] = value;
      setHasChanges(true);
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const saveArticle = useCallback(async () => {
    if (!article) return;

    const changes = { ...pendingChangesRef.current };
    if (Object.keys(changes).length === 0) return;

    // Re-add monetization comments to content fields before saving
    if (changes.content_en !== undefined) {
      changes.content_en = prepareContentForSave(changes.content_en, monetizationCommentsRef.current.en);
    }
    if (changes.content_pl !== undefined) {
      changes.content_pl = prepareContentForSave(changes.content_pl, monetizationCommentsRef.current.pl);
    }

    setSaving(true);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-article',
          articleId: article.id,
          fields: changes,
        }),
      });
      const result = await res.json();
      if (result.success) {
        pendingChangesRef.current = {};
        setHasChanges(false);
        setLastSaved(new Date().toLocaleTimeString());
        onSaved?.();
      } else {
        setError(`Save failed: ${result.error}`);
      }
    } catch (err: any) {
      setError(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [article, onSaved]);

  const handleManualSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    saveArticle();
  }, [saveArticle]);

  const handleHeroImageReplace = useCallback(() => {
    const url = window.prompt('Enter new hero image URL:', article?.image_url || '');
    if (url !== null && url !== article?.image_url) {
      updateField('image_url', url);
    }
  }, [article?.image_url, updateField]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          Loading article...
        </div>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500 text-lg">Failed to load article</div>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!article) return null;

  const currentContent = activeLanguage === 'en' ? article.content_en : article.content_pl;
  const currentExcerpt = activeLanguage === 'en' ? article.excerpt_en : article.excerpt_pl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              title="Back to articles"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Article</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {article.id} | Created: {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Saved at {lastSaved}
              </span>
            )}
            {hasChanges && !saving && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
            )}
            {saving && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                Saving...
              </span>
            )}
            <button
              onClick={handleManualSave}
              disabled={!hasChanges || saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
            >
              Save
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              dismiss
            </button>
          </div>
        )}

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title (EN)
          </label>
          <input
            type="text"
            value={article.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold"
          />
        </div>

        {/* Category + Author row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={article.category || 'tech'}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Author
            </label>
            <input
              type="text"
              value={article.author || ''}
              onChange={(e) => updateField('author', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source URL
            </label>
            <input
              type="text"
              value={article.source_url || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm truncate"
              title={article.source_url || 'No source'}
            />
          </div>
        </div>

        {/* Hero Image */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hero Image
          </label>
          <div
            className="relative group cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
            onClick={handleHeroImageReplace}
          >
            {article.image_url ? (
              <img
                src={article.image_url}
                alt="Hero"
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                No image set
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white font-medium text-sm bg-black/60 px-3 py-1.5 rounded-lg transition-opacity">
                Click to replace image
              </span>
            </div>
          </div>
          <input
            type="text"
            value={article.image_url || ''}
            onChange={(e) => updateField('image_url', e.target.value)}
            placeholder="Image URL..."
            className="w-full mt-2 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          />
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Language Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveLanguage('en')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeLanguage === 'en'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setActiveLanguage('pl')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeLanguage === 'pl'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Polish
          </button>
        </div>

        {/* Polish Title (shown only on PL tab) */}
        {activeLanguage === 'pl' && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title (PL) — stored in tags[0]
            </label>
            <input
              type="text"
              value={polishTitle}
              onChange={(e) => {
                setPolishTitle(e.target.value);
                // Polish title is stored as tags[0]
                updateField('tags' as any, [e.target.value]);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
            />
          </div>
        )}

        {/* Excerpt */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Excerpt ({activeLanguage.toUpperCase()})
          </label>
          <textarea
            value={currentExcerpt || ''}
            onChange={(e) =>
              updateField(activeLanguage === 'en' ? 'excerpt_en' : 'excerpt_pl', e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-y"
            placeholder="Article excerpt..."
          />
        </div>

        {/* WYSIWYG Editor */}
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content ({activeLanguage.toUpperCase()})
          </label>
          <RichTextEditor
            key={`${articleId}-${activeLanguage}`}
            content={currentContent || ''}
            onChange={(html) =>
              updateField(activeLanguage === 'en' ? 'content_en' : 'content_pl', html)
            }
            placeholder={`Write ${activeLanguage === 'en' ? 'English' : 'Polish'} content...`}
            enableImages
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          {article.source_url && (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
            >
              View Source
            </a>
          )}
          <button
            onClick={handleManualSave}
            disabled={!hasChanges || saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
