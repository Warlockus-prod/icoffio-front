'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';

interface AIGenerateProps {
  onSubmit?: () => void;
}

export default function AIGenerate({ onSubmit }: AIGenerateProps) {
  const { addTextToQueue, parsingQueue } = useAdminStore();
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'ai', name: 'AI & Machine Learning', icon: '🤖' },
    { id: 'apple', name: 'Apple & iOS', icon: '🍎' },
    { id: 'tech', name: 'Technology', icon: '⚙️' },
    { id: 'digital', name: 'Digital & Trends', icon: '📱' }
  ];

  const tones = [
    { id: 'professional', name: 'Professional', icon: '💼' },
    { id: 'casual', name: 'Casual', icon: '😊' },
    { id: 'technical', name: 'Technical', icon: '🔧' },
    { id: 'news', name: 'News Style', icon: '📰' }
  ];

  const lengths = [
    { id: 'short', name: 'Short (500-800 words)', icon: '📝' },
    { id: 'medium', name: 'Medium (800-1200 words)', icon: '📄' },
    { id: 'long', name: 'Long (1200-2000 words)', icon: '📃' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsSubmitting(true);
    try {
      // Генерируем заголовок и контент на основе темы
      const generatedTitle = `${topic}: полное руководство и анализ`;
      const generatedContent = `Тема: ${topic}

Это статья, сгенерированная ИИ на тему "${topic}". 

## Введение
${topic} - это важная тема в современном мире технологий. В данной статье мы рассмотрим основные аспекты и практические применения.

## Основная информация
Мы детально изучим ключевые моменты по теме "${topic}", предоставив читателям исчерпывающую информацию.

## Практическое применение
Рассмотрим конкретные примеры использования и внедрения решений, связанных с темой "${topic}".

## Заключение
Подводя итоги по теме "${topic}", можно сказать, что это перспективное направление для дальнейшего изучения и развития.

Стиль: ${tone}
Категория: ${category || 'tech'}
Длина: ${length} статья`;

      await addTextToQueue(generatedTitle, generatedContent, category || 'tech');
      
      // Очищаем форму после успешной отправки
      setTopic('');
      setCategory('');
      setTone('professional');
      setLength('medium');
      
      onSubmit?.();
    } catch (error) {
      console.error('Error generating AI article:', error);
      // TODO: показать пользователю ошибку
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = topic.trim();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>🤖</span>
          Generate Article with AI
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Опишите тему, и ИИ создаст полную статью с автоматическим переводом на все языки
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input */}
        <div className="space-y-2">
          <label htmlFor="ai-topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Article Topic
          </label>
          <div className="relative">
            <input
              id="ai-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="e.g., 'Latest advances in machine learning', 'iPhone 15 features', 'Cybersecurity trends 2024'"
              disabled={isSubmitting}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="text-lg">💡</span>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(category === cat.id ? '' : cat.id)}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                  category === cat.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                disabled={isSubmitting}
              >
                <span>{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tone Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Writing Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tones.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                  tone === t.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                disabled={isSubmitting}
              >
                <span>{t.icon}</span>
                <span className="text-sm font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Length Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Article Length
          </label>
          <div className="space-y-2">
            {lengths.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLength(l.id)}
                className={`w-full px-3 py-2 rounded-lg border flex items-center gap-2 transition-all text-left ${
                  length === l.id
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                disabled={isSubmitting}
              >
                <span>{l.icon}</span>
                <span className="text-sm font-medium">{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all ${
              isFormValid && !isSubmitting
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm hover:shadow'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Generate Article</span>
              </>
            )}
          </button>

          {parsingQueue.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span>📊</span>
              <span>{parsingQueue.length} article{parsingQueue.length !== 1 ? 's' : ''} in queue</span>
            </div>
          )}
        </div>
      </form>

      {/* AI Generation Tips */}
      <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>🧠</span>
          AI Generation Tips
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>Будьте конкретны:</strong> "iPhone 15 Pro camera features" лучше чем "phone cameras"</li>
          <li>• <strong>Используйте ключевые слова:</strong> Включайте важные термины для SEO</li>
          <li>• <strong>ИИ улучшения:</strong> Контент автоматически оптимизируется для читабельности</li>
          <li>• <strong>Мультиязычность:</strong> Статья переводится на 6 языков (EN, PL, DE, RO, CS)</li>
          <li>• <strong>Изображения:</strong> Автоматически подбираются релевантные изображения</li>
        </ul>
      </div>
    </div>
  );
}
