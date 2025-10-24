'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';

interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
}

interface MobileNavProps {
  menuItems: readonly MenuItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export default function MobileNav({ menuItems, activeTab, onTabChange, onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - только на мобильных */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-none"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
          <span className={`w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </div>
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">iC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">icoffio</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <span className="text-2xl text-gray-500 dark:text-gray-400">×</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full text-left px-4 py-4 rounded-lg transition-all duration-200 min-h-[56px] touch-none ${
                activeTab === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="font-medium text-base">{item.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="space-y-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 px-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>API Status: Online</span>
            </div>
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-base text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 min-h-[48px] touch-none"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

