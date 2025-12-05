'use client';

import { useState, useEffect } from 'react';
import { getAdminUsername, setAdminUsername, hasAdminUsername } from '@/lib/activity-logger';

/**
 * 👤 USERNAME PROMPT v8.3.0
 * 
 * Запрашивает имя пользователя при первом входе в админку.
 * Сохраняется в localStorage для логирования активности.
 */

interface UsernamePromptProps {
  onComplete?: (username: string) => void;
}

export default function UsernamePrompt({ onComplete }: UsernamePromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  // Проверяем нужно ли показывать промпт
  useEffect(() => {
    if (!hasAdminUsername()) {
      setIsOpen(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = username.trim();
    
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    
    // Сохраняем имя
    setAdminUsername(trimmedName);
    setIsOpen(false);
    onComplete?.(trimmedName);
    
    console.log(`👤 Admin username set: ${trimmedName}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl text-white">
              👤
            </div>
            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">
              Welcome to Admin Panel
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
              Enter your name for activity logging
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. John, admin@icoffio.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 This name will be shown in the Activity Log when you publish articles or make changes.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg transition-all"
            >
              Continue to Admin Panel →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Компонент для изменения имени (можно добавить в Settings)
 */
export function ChangeUsernameButton() {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const currentName = getAdminUsername();

  const handleSave = () => {
    if (newName.trim().length >= 2) {
      setAdminUsername(newName.trim());
      setIsEditing(false);
      window.location.reload(); // Refresh to apply
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={currentName || 'Your name'}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
        >
          Save
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setNewName(currentName || '');
        setIsEditing(true);
      }}
      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
    >
      👤 {currentName || 'Set name'} <span className="text-xs">(change)</span>
    </button>
  );
}

