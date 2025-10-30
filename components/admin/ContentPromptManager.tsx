'use client';

/**
 * CONTENT PROMPT MANAGER v7.8.1
 * 
 * UI компонент для управления промптами обработки контента:
 * - Просмотр preset шаблонов
 * - Редактирование промптов
 * - Preview результата
 * - Тестирование на примерах
 * 
 * @version 7.8.1
 * @date 2025-10-30
 */

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CONTENT_PROMPT_TEMPLATES,
  ContentPromptTemplate,
  ContentProcessingStyle,
  buildContentPrompt
} from '@/lib/config/content-prompts';

export default function ContentPromptManager() {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentPromptTemplate>(
    CONTENT_PROMPT_TEMPLATES[0]
  );
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [testText, setTestText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState('');

  /**
   * Тестирование промпта на примере текста
   */
  const handleTestPrompt = async () => {
    if (!testText.trim()) {
      toast.error('Введите текст для тестирования');
      return;
    }

    setIsProcessing(true);
    toast.loading('Обработка текста...', { id: 'test-prompt' });

    try {
      const finalPrompt = buildContentPrompt(
        selectedTemplate.id,
        selectedTemplate.style === 'custom' ? customPrompt : undefined
      );

      // Вызов к OpenAI API для тестирования
      const response = await fetch('/api/admin/test-content-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          systemPrompt: finalPrompt,
          style: selectedTemplate.style
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      setProcessedResult(result.processedText);
      toast.success('✅ Текст обработан!', { id: 'test-prompt' });

    } catch (error: any) {
      console.error('[ContentPromptManager] Test failed:', error);
      toast.error(`❌ Ошибка: ${error.message}`, { id: 'test-prompt' });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Копирование промпта в буфер обмена
   */
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('📋 Промпт скопирован!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          📝 Управление промптами контента
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Настройте стили обработки текста для статей и Telegram бота
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Всего шаблонов</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {CONTENT_PROMPT_TEMPLATES.length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Активных</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {CONTENT_PROMPT_TEMPLATES.filter(t => t.enabled).length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Дефолтный</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {CONTENT_PROMPT_TEMPLATES.find(t => t.isDefault)?.icon}{' '}
            {CONTENT_PROMPT_TEMPLATES.find(t => t.isDefault)?.name}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Выбран</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {selectedTemplate.icon} {selectedTemplate.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Templates List */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Preset шаблоны
          </h3>

          <div className="space-y-2">
            {CONTENT_PROMPT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTemplate.id === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h4>
                      {template.isDefault && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {template.description}
                    </p>
                  </div>
                  {!template.enabled && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected Template Details */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Детали шаблона: {selectedTemplate.icon} {selectedTemplate.name}
          </h3>

          {/* System Prompt */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Системный промпт
                </h4>
                <button
                  onClick={() => handleCopyPrompt(selectedTemplate.systemPrompt)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  📋 Копировать
                </button>
              </div>
            </div>
            <div className="p-4">
              {editingPrompt === selectedTemplate.id ? (
                <div className="space-y-2">
                  <textarea
                    value={selectedTemplate.systemPrompt}
                    onChange={(e) => {
                      // В продакшене здесь будет update функция
                      console.log('Update prompt:', e.target.value);
                    }}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        toast.success('Промпт сохранен!');
                        setEditingPrompt(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      ✅ Сохранить
                    </button>
                    <button
                      onClick={() => setEditingPrompt(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      ✖️ Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded">
                    {selectedTemplate.systemPrompt}
                  </pre>
                  <button
                    onClick={() => setEditingPrompt(selectedTemplate.id)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ✏️ Редактировать
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Custom Prompt (для custom style) */}
          {selectedTemplate.style === 'custom' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Кастомные инструкции
                </h4>
              </div>
              <div className="p-4">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Введите ваши собственные инструкции для AI..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Эти инструкции будут добавлены к базовому промпту
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Testing Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🧪 Тестирование промпта
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Исходный текст
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Введите текст для тестирования промпта..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Output */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Обработанный текст
            </label>
            <div className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              {processedResult ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {processedResult}
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Результат появится здесь...
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleTestPrompt}
          disabled={isProcessing || !testText.trim()}
          className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
        >
          {isProcessing ? '⏳ Обработка...' : '🚀 Тестировать промпт'}
        </button>
      </div>

      {/* Usage Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
          ℹ️ Как это работает
        </h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• <strong>В админ-панели</strong>: выбирайте стиль при создании/редактировании статьи</li>
          <li>• <strong>В Telegram боте</strong>: пользователи получают кнопки выбора стиля при отправке текста</li>
          <li>• <strong>Кастомный промпт</strong>: позволяет ввести свои инструкции для уникальной обработки</li>
          <li>• <strong>Тестирование</strong>: проверьте как работает промпт перед использованием</li>
        </ul>
      </div>
    </div>
  );
}

