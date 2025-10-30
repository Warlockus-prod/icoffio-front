'use client';

import { ReactNode } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';
import Toast from './Toast';
import MobileNav from './MobileNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { activeTab, setActiveTab, logout } = useAdminStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Statistics and overview' },
    { id: 'parser', label: 'Create Articles', icon: '🔗', description: 'URL/Text/AI creation' },
    { id: 'articles', label: 'All Articles', icon: '📚', description: 'Manage all articles' },
    { id: 'editor', label: 'Article Editor', icon: '✏️', description: 'Edit content' },
    { id: 'queue', label: 'Publish Queue', icon: '📤', description: 'Publication queue' },
    { id: 'images', label: 'Images', icon: '🖼️', description: 'Image gallery' },
    { id: 'advertising', label: 'Advertising', icon: '📊', description: 'Manage ad placements' },
    { id: 'content-prompts', label: 'Content Prompts', icon: '📝', description: 'Manage text processing styles' },
    { id: 'logs', label: 'System Logs', icon: '📋', description: 'Logs and diagnostics' },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'System settings' }
  ] as const;

  return (
    <>
      {/* Toast Notifications */}
      <Toast />
      
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
          {menuItems.map((item) => (
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
                menuItems={menuItems}
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
                  <span className="text-white text-sm font-medium">A</span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Admin</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Administrator</div>
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




