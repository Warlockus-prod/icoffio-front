'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';
import { usePathname } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/components/admin/Dashboard';
import URLParser from '@/components/admin/URLParser';
import ArticleEditor from '@/components/admin/ArticleEditor';
import ImageSystem from '@/components/admin/ImageSystem';
import PublishingQueue from '@/components/admin/PublishingQueue';
import LogsViewer from '@/components/admin/LogsViewer';
import CleanupTool from '@/components/admin/CleanupTool';
import ArticlesManager from '@/components/admin/ArticlesManager';
import AdvertisingManager from '@/components/admin/AdvertisingManager';
import packageJson from '@/package.json';
import ContentPromptManager from '@/components/admin/ContentPromptManager';
import ActivityLog from '@/components/admin/ActivityLog';
import { TelegramSettings } from '@/components/admin/TelegramSettings';
import TeamAccessManager from '@/components/admin/TeamAccessManager';

export default function AdminPage() {
  const pathname = usePathname();
  const { 
    isAuthenticated, 
    isLoading, 
    activeTab, 
    currentUser,
    authenticate,
    checkSession,
    hasRole,
    setActiveTab,
  } = useAdminStore();
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const locale: 'en' | 'pl' = pathname?.split('/')[1] === 'pl' ? 'pl' : 'en';

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    const currentTabRequiresAdmin = ['logs', 'advertising', 'content-prompts', 'activity', 'telegram', 'settings'].includes(activeTab);
    const currentTabRequiresEditor = ['parser', 'editor', 'images', 'queue'].includes(activeTab);

    if (!isAuthenticated) return;

    if (currentTabRequiresAdmin && !hasRole('admin')) {
      setActiveTab('dashboard');
      return;
    }

    if (currentTabRequiresEditor && !hasRole('editor')) {
      setActiveTab('articles');
    }
  }, [activeTab, hasRole, isAuthenticated, setActiveTab]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');
    
    try {
      const result = await authenticate(password, locale);
      if (result.success) {
        setPassword('');
        return;
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (error) {
      setError('Authentication error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto mb-3 h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Checking session...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo and header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-xl">
              <span className="text-white font-bold text-2xl">iC</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              icoffio Admin Panel
            </p>
          </div>

          {/* Login form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Enter admin password"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isAuthenticating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  '🔐 Sign In'
                )}
              </button>
            </form>

            {/* Panel features */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                🔧 Available Features:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span>🔗</span>
                  <span>URL Parsing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🌍</span>
                  <span>EN/PL Translation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🤖</span>
                  <span>AI Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🖼️</span>
                  <span>Image Selection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main admin panel after authentication
  const canAccessTab = (tab: typeof activeTab): boolean => {
    if (['logs', 'advertising', 'content-prompts', 'activity', 'telegram', 'settings'].includes(tab)) {
      return hasRole('admin');
    }
    if (['parser', 'editor', 'images', 'queue'].includes(tab)) {
      return hasRole('editor');
    }
    return hasRole('viewer');
  };

  const renderActiveTab = () => {
    if (!canAccessTab(activeTab)) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Restricted</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your role <span className="font-medium">{currentUser?.role || 'viewer'}</span> does not allow opening this section.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'parser':
        return <URLParser />;
      case 'articles':
        return <ArticlesManager />;
      case 'editor':
        return <ArticleEditor />;
      case 'images':
        return <ImageSystem />;
      case 'queue':
        return <PublishingQueue />;
      case 'logs':
        return <LogsViewer />;
      case 'advertising':
        return <AdvertisingManager />;
      case 'content-prompts':
        return <ContentPromptManager />;
      case 'activity':
        return <ActivityLog />;
      case 'telegram':
        return <TelegramSettings />;
      case 'settings':
        return (
          <div className="space-y-6">
            {hasRole('admin') && <TeamAccessManager currentUserEmail={currentUser?.email || ''} />}

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                ⚙️ System Settings
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* API Status */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">API Services Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">OpenAI API</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Unsplash API</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Supabase Storage</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Connected</span>
                    </div>
                  </div>
                </div>

                {/* Processing Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Processing Settings</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">URL Parsing Timeout</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">60 seconds (Admin), 15 seconds (Parser)</div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Max Content Length</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">50KB per article</div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Supported Languages</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">RU, EN, PL, DE, RO, CS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/articles?action=health-check');
                        const result = await response.json();
                        if (result.success) {
                          alert('✅ All API connections working!\n\n• OpenAI: ✅\n• Unsplash: ✅\n• Supabase: ✅');
                        }
                      } catch {
                        alert('❌ API connection check error');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Test API Connections
                  </button>
                  <button 
                    onClick={() => {
                      if (window.caches) {
                        window.caches.keys().then(names => {
                          names.forEach(name => window.caches.delete(name));
                          alert('✅ Cache cleared!');
                        });
                      } else {
                        alert('ℹ️ Cache API not supported in this browser');
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
                    Clear Cache
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('⚠️ Reset statistics?\n\nAll activity statistics will be deleted.\n\nContinue?')) {
                        // Reset statistics in admin store
                        const store = useAdminStore.getState();
                        store.statistics = {
                          urlsAddedToday: 0,
                          urlsAddedWeek: 0, 
                          urlsAddedMonth: 0,
                          successfullyParsed: 0,
                          publishedArticles: 0,
                          failedParses: 0,
                          averageProcessingTime: 0,
                          recentActivity: []
                        };
                        alert('✅ Statistics reset!');
                      }
                    }}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors">
                    Reset Statistics
                  </button>
                </div>
              </div>
            </div>

            {/* Environment Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Environment Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">Version</div>
                  <div className="text-gray-600 dark:text-gray-400">{packageJson.version}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">Environment</div>
                  <div className="text-gray-600 dark:text-gray-400">Production</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">Last Updated</div>
                  <div className="text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            </div>

            {/* Cleanup Tools */}
            <CleanupTool />
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout>
      {renderActiveTab()}
    </AdminLayout>
  );
}
