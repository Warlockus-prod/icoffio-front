'use client'

import { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import { MassTranslation } from '@/components/MassTranslation';

export default function AdminTranslatePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Проверка аутентификации при загрузке
  useEffect(() => {
    // Проверяем что мы в браузере (не SSR)
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('icoffio_admin_auth');
      if (savedAuth === 'authenticated') {
        setIsAuthenticated(true);
      }
    }
    setIsLoading(false);
  }, []);

  // Аутентификация
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Простая проверка пароля (в продакшене лучше использовать более безопасный метод)
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icoffio2025';
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      // Проверяем что мы в браузере перед использованием localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('icoffio_admin_auth', 'authenticated');
      }
      setError('');
    } else {
      setError('Неверный пароль');
    }
  };

  // Выход
  const handleLogout = () => {
    setIsAuthenticated(false);
    // Проверяем что мы в браузере перед использованием localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('icoffio_admin_auth');
    }
    setPassword('');
  };

  if (isLoading) {
    return (
      <Container>
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка админ панели...</p>
        </div>
      </Container>
    );
  }

  // Форма аутентификации
  if (!isAuthenticated) {
    return (
      <Container>
        <div className="min-h-screen flex items-center justify-center py-12">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                🔐 Админ панель icoffio
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Введите пароль для доступа к панели управления
              </p>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleAuth}>
              <div>
                <label htmlFor="password" className="sr-only">
                  Пароль
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Введите пароль администратора"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  🚀 Войти в админ панель
                </button>
              </div>
              
              <div className="text-center">
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    🔧 Доступные функции:
                  </p>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <div>📝 Создание статей из URL и текста</div>
                    <div>🌍 Автоматический перевод на 5 языков</div>
                    <div>🤖 ИИ улучшение контента</div>
                    <div>🖼️ Генерация изображений</div>
                    <div>📊 Мониторинг системы</div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Container>
    );
  }

  // Главная админ панель
  return (
    <Container>
      <div className="py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ⚡ Админ панель icoffio
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Управление статьями и контентом сайта
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            🚪 Выйти
          </button>
        </div>

        {/* Панель быстрых ссылок */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <a
            href="/ru/admin/add-article"
            className="block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <div className="text-2xl mb-2">📝</div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
              Создать статью
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Из URL или ручного ввода
            </p>
          </a>
          
          <div className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-2xl mb-2">🚀</div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-200">
              N8N Интеграция
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Telegram бот → Статьи
            </p>
          </div>
          
          <div className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-200">
              Аналитика
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Статистика и мониторинг
            </p>
          </div>
        </div>

        {/* Массовый перевод */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            🌍 Массовый перевод статей
          </h2>
          <MassTranslation />
        </div>

        {/* Системная информация */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            🔧 Системная информация
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Среда</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {process.env.NODE_ENV}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Версия API</div>
              <div className="font-medium text-gray-900 dark:text-white">2.0.0</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Языки</div>
              <div className="font-medium text-gray-900 dark:text-white">6 языков</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Обновлено</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {new Date().toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
