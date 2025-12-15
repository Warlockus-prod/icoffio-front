'use client';

import { useState } from 'react';
import { localArticleStorage } from '@/lib/local-article-storage';
import { adminLogger } from '@/lib/admin-logger';

export default function CleanupTool() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка статистики
  const loadStats = () => {
    const articles = localArticleStorage.getAllArticles();
    const storage = localArticleStorage.getStats();
    
    // Анализ дублей
    const slugCounts: Record<string, number> = {};
    const titleCounts: Record<string, number> = {};
    const imageCounts: Record<string, number> = {};
    
    articles.forEach(article => {
      // Подсчет по slug (без языкового суффикса для поиска дублей)
      const baseSlug = article.slug.replace(/-ru$|-en$|-pl$/, '');
      slugCounts[baseSlug] = (slugCounts[baseSlug] || 0) + 1;
      
      // Подсчет по заголовку
      const baseTitle = article.title.replace(/ \(RU\)| \(EN\)| \(PL\)$/, '');
      titleCounts[baseTitle] = (titleCounts[baseTitle] || 0) + 1;
      
      // Подсчет одинаковых изображений
      if (article.image) {
        imageCounts[article.image] = (imageCounts[article.image] || 0) + 1;
      }
    });

    const duplicateSlugs = Object.entries(slugCounts).filter(([_, count]) => count > 3).length;
    const duplicateImages = Object.entries(imageCounts).filter(([_, count]) => count > 5).length;
    const testArticles = articles.filter(a => 
      a.title.toLowerCase().includes('test') || 
      a.title.toLowerCase().includes('demo') ||
      a.title.toLowerCase().includes('emergency')
    ).length;

    setStats({
      ...storage,
      duplicateSlugs,
      duplicateImages, 
      testArticles,
      oldArticles: articles.filter(a => {
        const created = new Date(a.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return created < weekAgo;
      }).length
    });
  };

  // Очистка тестовых статей
  const cleanupTestArticles = () => {
    if (!window.confirm('🧪 Удалить все тестовые статьи?\n\nБудут удалены статьи содержащие: test, demo, emergency\n\nПродолжить?')) {
      return;
    }

    setIsLoading(true);
    try {
      const articles = localArticleStorage.getAllArticles();
      const testKeywords = ['test', 'demo', 'emergency', 'quick', 'final'];
      
      let cleaned = 0;
      const filtered = articles.filter(article => {
        const isTest = testKeywords.some(keyword => 
          article.title.toLowerCase().includes(keyword) ||
          article.content.toLowerCase().includes(keyword)
        );
        
        if (isTest) cleaned++;
        return !isTest;
      });

      localStorage.setItem('icoffio_admin_articles', JSON.stringify(filtered));
      
      adminLogger.info('system', 'cleanup_test_articles', `Cleaned ${cleaned} test articles`);
      alert(`✅ Удалено ${cleaned} тестовых статей!`);
      loadStats();
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('❌ Ошибка очистки. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  // Очистка дублирующихся изображений
  const cleanupDuplicateImages = () => {
    if (!window.confirm('🖼️ Обновить дублирующиеся изображения?\n\nСтатьи с одинаковыми изображениями получат уникальные картинки\n\nПродолжить?')) {
      return;
    }

    setIsLoading(true);
    try {
      const articles = localArticleStorage.getAllArticles();
      const imageCounts: Record<string, number> = {};
      
      // Подсчитываем использование изображений
      articles.forEach(article => {
        if (article.image) {
          imageCounts[article.image] = (imageCounts[article.image] || 0) + 1;
        }
      });

      // Набор новых изображений по категориям
      const newImages = {
        ai: [
          'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop', 
          'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=1200&h=630&fit=crop'
        ],
        apple: [
          'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1606229365346-0d3d621d8a48?w=1200&h=630&fit=crop'
        ],
        tech: [
          'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop'
        ],
        games: [
          'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1556438064-2d7646166914?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=630&fit=crop',
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=630&fit=crop'
        ]
      };

      let updated = 0;
      const updatedArticles = articles.map(article => {
        if (article.image && imageCounts[article.image] > 2) {
          const categoryImages = newImages[article.category as keyof typeof newImages] || newImages.tech;
          const newImage = categoryImages[Math.floor(Math.random() * categoryImages.length)];
          updated++;
          return { ...article, image: newImage, updatedAt: new Date().toISOString() };
        }
        return article;
      });

      localStorage.setItem('icoffio_admin_articles', JSON.stringify(updatedArticles));
      
      adminLogger.info('system', 'cleanup_duplicate_images', `Updated ${updated} duplicate images`);
      alert(`✅ Обновлено ${updated} дублирующихся изображений!`);
      loadStats();
    } catch (error) {
      console.error('Image cleanup failed:', error);
      alert('❌ Ошибка обновления изображений. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка статистики при монтировании
  useState(() => {
    loadStats();
  });

  if (!stats) return <div>Loading cleanup statistics...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        🧹 Content Cleanup Tools
      </h3>
      
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Articles</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.testArticles}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Test Articles</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.duplicateSlugs}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Duplicate Slugs</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.duplicateImages}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Duplicate Images</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={cleanupTestArticles}
            disabled={isLoading || stats.testArticles === 0}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isLoading ? '🔄' : '🧪'} Clean Test Articles ({stats.testArticles})
          </button>
          
          <button
            onClick={cleanupDuplicateImages}
            disabled={isLoading || stats.duplicateImages === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isLoading ? '🔄' : '🖼️'} Fix Duplicate Images ({stats.duplicateImages})
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('⚠️ ОПАСНО: Удалить ВСЕ статьи?\n\nЭто удалит все созданные статьи безвозвратно!\n\nПродолжить только если вы уверены!')) {
                localArticleStorage.clearAll();
                loadStats();
                alert('✅ Все статьи удалены!');
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            🗑️ Clear All Articles
          </button>
          
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            🔄 Refresh Stats
          </button>
        </div>
        
        {/* Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">📋 Cleanup Information</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• <strong>Test Articles:</strong> Статьи содержащие test, demo, emergency в заголовке</li>
            <li>• <strong>Duplicate Images:</strong> Изображения используемые более чем в 2 статьях</li>
            <li>• <strong>Language Separation:</strong> Система создает отдельные статьи для RU/EN/PL</li>
            <li>• <strong>Auto-cleanup:</strong> Старые логи и статьи автоматически удаляются через неделю</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
