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

export function TelegramSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatId, setChatId] = useState('');
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
    // Try to get chat_id from last published article or default
    loadDefaultSettings();
  }, []);

  const loadDefaultSettings = async () => {
    try {
      // Get REAL chat_id from last published article
      const articlesResponse = await fetch('/api/supabase-articles?limit=1&source=telegram-simple');
      const articlesData = await articlesResponse.json();
      
      let realChatId = 0;
      
      if (articlesData.articles && articlesData.articles.length > 0) {
        realChatId = articlesData.articles[0].chat_id || 0;
        console.log('[TelegramSettings] Found real chat_id:', realChatId);
      } else {
        console.warn('[TelegramSettings] No Telegram articles found, using default chat_id=0');
      }
      
      setChatId(realChatId.toString());
      
      const response = await fetch(`/api/telegram/settings?chatId=${realChatId}`);
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
            {settings.imagesCount === 2 && '🖼️🖼️ Hero + one in content'}
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

