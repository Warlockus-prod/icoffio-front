/**
 * TELEGRAM SETTINGS COMPONENT v8.5.0
 * 
 * Настройки для Telegram bot публикации:
 * - Content Style
 * - Images Count & Source
 * - Auto-publish
 */

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { TelegramSettings as TelegramSettingsType } from '@/lib/telegram-simple/types';

const CONTENT_STYLES = [
  { value: 'journalistic', label: '📰 Journalistic', description: 'Engaging, wide audience (default)' },
  { value: 'keep_as_is', label: '✋ Keep As Is', description: 'No changes to text' },
  { value: 'seo_optimized', label: '🔍 SEO Optimized', description: 'Keywords & structure' },
  { value: 'academic', label: '🎓 Academic', description: 'Formal, scientific' },
  { value: 'casual', label: '💬 Casual', description: 'Friendly, conversational' },
  { value: 'technical', label: '⚙️ Technical', description: 'Detailed, precise' },
];

const IMAGE_SOURCES = [
  { value: 'unsplash', label: 'Unsplash', description: 'Free stock photos' },
  { value: 'ai', label: 'AI Generated', description: 'DALL-E 3 (slower)' },
  { value: 'none', label: 'No Images', description: 'Text only' },
];

const INTERFACE_LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
];

interface TelegramSubmission {
  id: number;
  user_id: number;
  username?: string;
  first_name?: string;
  submission_type: 'url' | 'text';
  status: 'processing' | 'published' | 'failed';
  submitted_at?: string;
  processed_at?: string;
  processing_time_ms?: number;
  article_url_en?: string;
  article_url_pl?: string;
  error_message?: string;
}

export function TelegramSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [chatId, setChatId] = useState('');
  const [submissions, setSubmissions] = useState<TelegramSubmission[]>([]);
  const [settings, setSettings] = useState<TelegramSettingsType>({
    chatId: 0,
    contentStyle: 'journalistic',
    imagesCount: 2,
    imagesSource: 'unsplash',
    autoPublish: true,
    interfaceLanguage: 'ru',
  });

  // Load settings on mount
  useEffect(() => {
    loadDefaultSettings();
    loadRecentSubmissions();
  }, []);

  const loadDefaultSettings = async () => {
    try {
      // For now, use default chat_id = 0 (admin settings)
      // In future, can load from last Telegram user
      const defaultChatId = 0;
      setChatId(defaultChatId.toString());
      
      const response = await fetch(`/api/telegram/settings?chatId=${defaultChatId}`);
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const response = await fetch('/api/telegram/submissions?limit=20');
      const data = await response.json();

      if (data.success && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          chatId: parseInt(chatId) || 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Settings saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return '—';
    return `${Math.round(ms / 1000)}s`;
  };

  const getStatusBadge = (status: TelegramSubmission['status']) => {
    if (status === 'published') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    if (status === 'failed') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  };

  const publishedCount = submissions.filter((item) => item.status === 'published').length;
  const failedCount = submissions.filter((item) => item.status === 'failed').length;
  const processingCount = submissions.filter((item) => item.status === 'processing').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🤖 Telegram Bot Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure default settings for articles published via Telegram bot
        </p>
      </div>

      {/* Content Style */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          📝 Content Style
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          How should the bot process and rewrite the content?
        </p>
        
        <div className="space-y-2">
          {CONTENT_STYLES.map((style) => (
            <label
              key={style.value}
              className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                settings.contentStyle === style.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="contentStyle"
                value={style.value}
                checked={settings.contentStyle === style.value}
                onChange={(e) =>
                  setSettings({ ...settings, contentStyle: e.target.value as any })
                }
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {style.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {style.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Interface Language */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🌍 Bot Interface Language
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Language for Telegram bot commands and responses.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {INTERFACE_LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  interfaceLanguage: lang.value as TelegramSettingsType['interfaceLanguage'],
                })
              }
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                settings.interfaceLanguage === lang.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🖼️ Images
        </h2>
        
        {/* Images Count */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Images (0-3)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="3"
              value={settings.imagesCount}
              onChange={(e) =>
                setSettings({ ...settings, imagesCount: parseInt(e.target.value) })
              }
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 w-8 text-center">
              {settings.imagesCount}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {settings.imagesCount === 0 && '📝 Text only, no images'}
            {settings.imagesCount === 1 && '🖼️ Hero image only'}
            {settings.imagesCount === 2 && '🖼️🖼️ Hero + one in content (auto: 1 Unsplash + 1 AI)'}
            {settings.imagesCount === 3 && '🖼️🖼️🖼️ Hero + two in content'}
          </p>
        </div>

        {/* Images Source */}
        {settings.imagesCount > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image Source
            </label>
            <div className="space-y-2">
              {IMAGE_SOURCES.map((source) => (
                <label
                  key={source.value}
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.imagesSource === source.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="imagesSource"
                    value={source.value}
                    checked={settings.imagesSource === source.value}
                    onChange={(e) =>
                      setSettings({ ...settings, imagesSource: e.target.value as any })
                    }
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {source.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {source.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {settings.imagesCount === 2 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Для режима из 2 изображений источник комбинируется автоматически: 1 Unsplash + 1 AI.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Publishing */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🚀 Publishing
        </h2>
        
        <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600">
          <input
            type="checkbox"
            checked={settings.autoPublish}
            onChange={(e) =>
              setSettings({ ...settings, autoPublish: e.target.checked })
            }
            className="mt-1"
          />
          <div className="ml-3 flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              ✅ Auto-publish articles
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Automatically publish articles to the website. If disabled, articles will be saved as drafts for manual review.
            </div>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? '💾 Saving...' : '💾 Save Settings'}
        </button>
      </div>

      {/* Recent Telegram Submissions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              📊 Recent Telegram Submissions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Last 20 requests from Telegram bot
            </p>
          </div>
          <button
            onClick={loadRecentSubmissions}
            disabled={submissionsLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {submissionsLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{publishedCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Published</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{processingCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Processing</div>
          </div>
        </div>

        {submissionsLoading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">No Telegram submissions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {submissions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {item.submission_type === 'url' ? '🔗 URL' : '📝 Text'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {item.username ? `@${item.username}` : item.first_name || `user_${item.user_id}`}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {formatDateTime(item.submitted_at)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {formatDuration(item.processing_time_ms)}
                    </td>
                    <td className="px-3 py-2">
                      {item.status === 'published' && item.article_url_en ? (
                        <div className="flex gap-2">
                          <a
                            href={item.article_url_en}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            EN
                          </a>
                          {item.article_url_pl && (
                            <a
                              href={item.article_url_pl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              PL
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          {item.error_message ? '❌ Error' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> These settings apply to all new articles published via Telegram bot.
          You can still edit each article individually in the admin panel after publication.
        </p>
      </div>
    </div>
  );
}
