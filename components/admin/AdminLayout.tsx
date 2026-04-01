'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';
import Toast from './Toast';
import MobileNav from './MobileNav';
import UsernamePrompt, { ChangeUsernameButton } from './UsernamePrompt';
import { getAdminUsername } from '@/lib/activity-logger';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { activeTab, setActiveTab, logout, currentUser, hasRole } = useAdminStore();

  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  // Получаем имя админа из localStorage
  useEffect(() => {
    const name = getAdminUsername();
    setAdminUsername(name);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Statistics and overview', hidden: false },
    { id: 'parser', label: 'Create Articles', icon: '🔗', description: 'URL/Text/AI creation', hidden: false },
    { id: 'articles', label: 'All Articles', icon: '📚', description: 'Manage all articles', hidden: false },
    { id: 'editor', label: 'Article Editor', icon: '✏️', description: 'Edit content', hidden: false },
    { id: 'queue', label: 'Publish Queue', icon: '📤', description: 'Publication queue', hidden: false },
    { id: 'images', label: 'Images', icon: '🖼️', description: 'Image gallery', hidden: false },
    { id: 'advertising', label: 'Advertising', icon: '📊', description: 'Manage ad placements', hidden: false },
    { id: 'content-prompts', label: 'Content Prompts', icon: '📝', description: 'Manage text processing styles', hidden: false },
    { id: 'activity', label: 'Activity', icon: '📊', description: 'User activity log', hidden: false },
    { id: 'telegram', label: 'Telegram', icon: '🤖', description: 'Telegram bot settings', hidden: false },
    { id: 'feedback', label: 'Feedback', icon: '🐛', description: 'Bug reports & feedback', hidden: false },
    { id: 'ad-diagnostics', label: 'Ad Diagnostics', icon: '🔍', description: 'Analyze ads on any site', hidden: false },
    { id: 'info-portal', label: 'Info Portal', icon: '📡', description: 'Feed aggregator management', hidden: false },
    { id: 'logs', label: 'System Logs', icon: '📋', description: 'Logs and diagnostics', hidden: false },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'System settings', hidden: false },
    // Hidden tab — only shown when editing a published article (not in sidebar)
    { id: 'published-editor', label: 'Edit Article', icon: '📝', description: 'Edit published article', hidden: true },
  ] as const;

  const visibleMenuItems = menuItems.filter((item) => {
    // Never show hidden tabs in sidebar
    if (item.hidden) return false;
    if (['logs', 'advertising', 'content-prompts', 'activity', 'telegram', 'settings', 'feedback', 'ad-diagnostics', 'info-portal'].includes(item.id)) {
      return hasRole('admin');
    }
    if (['parser', 'editor', 'images', 'queue'].includes(item.id)) {
      return hasRole('editor');
    }
    return hasRole('viewer');
  });

  return (
    <>
      {/* Toast Notifications */}
      <Toast />
      
      {/* Username Prompt Modal - appears on first login */}
      <UsernamePrompt onComplete={(name) => setAdminUsername(name)} />
      
      <div 
        className="flex h-screen bg-gray-50 dark:bg-gray-900"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
      >
        {/* Sidebar - скрыт на мобильных */}
      <div className="hidden md:flex w-64 bg-white dark:bg-gray-800 shadow-lg flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">iC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">icoffio</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Bottom Actions - Fixed positioning */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>API Status: Online</span>
            </div>
            <button
              onClick={logout}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-200 dark:border-red-800"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <MobileNav
                menuItems={visibleMenuItems}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as any)}
                onLogout={logout}
              />
              
              {/* Page Title */}
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {menuItems.find(item => item.id === activeTab)?.label}
                </h2>
                <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                  {menuItems.find(item => item.id === activeTab)?.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">System Online</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Last sync: just now
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {adminUsername ? adminUsername.charAt(0).toUpperCase() : 'A'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {adminUsername || 'Admin'}
                  </div>
                  <div className="flex items-center gap-2">
                    <ChangeUsernameButton />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                      {currentUser?.role || 'viewer'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}



