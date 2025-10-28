'use client';

/**
 * AdvertisingManager - Система управления рекламными местами
 * Позволяет включать/выключать рекламу, просматривать статистику и управлять позициями
 * 
 * @version 7.6.0
 * @date 2025-10-28
 */

import { useState } from 'react';
import { 
  AD_PLACEMENTS, 
  getAdPlacementsStats,
  getAdPlacementsByDevice,
  AdPlacementConfig 
} from '@/lib/config/adPlacements';

export default function AdvertisingManager() {
  const [selectedDevice, setSelectedDevice] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const stats = getAdPlacementsStats();
  
  // Фильтрация рекламных мест
  const getFilteredPlacements = () => {
    let filtered = AD_PLACEMENTS;
    
    // Фильтр по устройству
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(ad => 
        ad.device === selectedDevice || ad.device === 'both'
      );
    }
    
    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ad =>
        ad.name.toLowerCase().includes(query) ||
        ad.description.toLowerCase().includes(query) ||
        ad.placeId.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => b.priority - a.priority);
  };

  const filteredPlacements = getFilteredPlacements();

  // Цвета для статусов
  const getStatusBadge = (status: AdPlacementConfig['status']) => {
    switch (status) {
      case 'stable':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">✅ Stable</span>;
      case 'new':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">🆕 New</span>;
      case 'testing':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">🧪 Testing</span>;
    }
  };

  // Иконка устройства
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return '🖥️';
      case 'mobile': return '📱';
      case 'both': return '🖥️📱';
      default: return '📱';
    }
  };

  // Копировать код
  const copyCode = (placeId: string, format: string) => {
    const code = `<UniversalAd 
  placeId="${placeId}" 
  format="${format}" 
  placement="inline"
/>`;
    navigator.clipboard.writeText(code);
    // TODO: показать toast уведомление
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Управление рекламой
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Централизованное управление всеми рекламными местами VOX Display
            </p>
          </div>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            onClick={() => window.open('/docs/advertising', '_blank')}
          >
            📖 Документация
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Всего мест</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.enabled}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Активно</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.disabled}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Отключено</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.byStatus.new}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Новых</div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Поиск по названию, описанию или PlaceID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Фильтр по устройству */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDevice('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedDevice === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setSelectedDevice('desktop')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedDevice === 'desktop'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🖥️ Desktop
            </button>
            <button
              onClick={() => setSelectedDevice('mobile')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedDevice === 'mobile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📱 Mobile
            </button>
          </div>
        </div>
      </div>

      {/* Список рекламных мест */}
      <div className="space-y-4">
        {filteredPlacements.map((ad) => (
          <div
            key={ad.id}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 transition-all ${
              ad.enabled
                ? 'border-green-300 dark:border-green-700'
                : 'border-gray-200 dark:border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Основная информация */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getDeviceIcon(ad.device)} {ad.name}
                  </h3>
                  {getStatusBadge(ad.status)}
                  {ad.enabled ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✅ Включено
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      ⏸️ Отключено
                    </span>
                  )}
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {ad.description}
                </p>

                {/* Детали */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Формат:</span>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">{ad.format}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">PlaceID:</span>
                    <div className="font-mono text-xs text-gray-900 dark:text-white truncate">{ad.placeId}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Позиция:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">{ad.position}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Приоритет:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">{ad.priority}/10</div>
                  </div>
                </div>
              </div>

              {/* Действия */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => copyCode(ad.placeId, ad.format)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="Копировать код компонента"
                >
                  📋 Код
                </button>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  title="Статистика (скоро)"
                  disabled
                >
                  📊 Stats
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Подсказка если ничего не найдено */}
      {filteredPlacements.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 text-center">
          <p className="text-yellow-800 dark:text-yellow-200">
            ⚠️ Не найдено рекламных мест по заданным фильтрам
          </p>
        </div>
      )}

      {/* Инструкция */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
          ℹ️ Как управлять рекламой
        </h3>
        <ul className="space-y-2 text-blue-800 dark:text-blue-300">
          <li><strong>Включить/Отключить:</strong> Редактируйте файл <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">lib/config/adPlacements.ts</code></li>
          <li><strong>Добавить новое место:</strong> Добавьте новый объект в массив <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">AD_PLACEMENTS</code></li>
          <li><strong>Изменить приоритет:</strong> Измените значение <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">priority</code> (1-10)</li>
          <li><strong>Скопировать код:</strong> Нажмите кнопку "📋 Код" для копирования React компонента</li>
          <li><strong>Новые PlaceID:</strong> Отмечены статусом "🆕 New" - требуют мониторинга fill rate</li>
        </ul>
      </div>
    </div>
  );
}

