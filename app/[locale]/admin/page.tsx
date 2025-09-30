'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/components/admin/Dashboard';
import URLParser from '@/components/admin/URLParser';
import ArticleEditor from '@/components/admin/ArticleEditor';
import ImageSystem from '@/components/admin/ImageSystem';
import PublishingQueue from '@/components/admin/PublishingQueue';

export default function AdminPage() {
  const { 
    isAuthenticated, 
    isLoading, 
    activeTab, 
    authenticate 
  } = useAdminStore();
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Проверка сохраненной аутентификации при загрузке
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('icoffio_admin_auth');
      if (savedAuth === 'authenticated') {
        // Simulate authentication without password check
        useAdminStore.setState({ isAuthenticated: true });
      }
    }
  }, []);

  // Обработка аутентификации
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authenticate(password)) {
      setError('');
      setPassword('');
    } else {
      setError('Неверный пароль');
    }
  };

  // Форма входа
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo и заголовок */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-xl">
              <span className="text-white font-bold text-2xl">iC</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Управление статьями icoffio
            </p>
          </div>

          {/* Форма входа */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пароль администратора
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Введите пароль"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                🚀 Войти в админ панель
              </button>
            </form>

            {/* Функции панели */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                🔧 Доступные функции:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span>🔗</span>
                  <span>URL парсинг</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🌍</span>
                  <span>Перевод EN/PL</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🤖</span>
                  <span>ИИ обработка</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🖼️</span>
                  <span>Изображения</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Главная админ панель после аутентификации
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'parser':
        return <URLParser />;
      case 'editor':
        return <ArticleEditor />;
      case 'images':
        return <ImageSystem />;
      case 'queue':
        return <PublishingQueue />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold mb-2">Settings</h3>
            <p className="text-gray-600">Coming in next update...</p>
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