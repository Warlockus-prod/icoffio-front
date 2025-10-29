'use client';

/**
 * AdvertisingManager - Real-time система управления рекламными местами
 * Позволяет включать/выключать, менять приоритет, добавлять новые места
 * 
 * @version 7.7.0
 * @date 2025-10-28
 */

import { useState, useEffect } from 'react';
import { AD_PLACEMENTS, AdPlacementConfig } from '@/lib/config/adPlacements';
import { 
  getAdPlacements,
  toggleAdPlacement,
  updateAdPriority,
  updateAdPlacement,
  addAdPlacement,
  deleteAdPlacement,
  resetToDefaults,
  hasCustomConfig,
  exportConfig,
  importConfig
} from '@/lib/config/adPlacementsManager';
import type { AdFormat, AdPlacement } from '@/components/UniversalAd';

export default function AdvertisingManager() {
  const [placements, setPlacements] = useState<AdPlacementConfig[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCustomConfig, setIsCustomConfig] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Загрузка конфигурации
  const loadPlacements = () => {
    const loaded = getAdPlacements();
    setPlacements(loaded);
    setIsCustomConfig(hasCustomConfig());
  };

  useEffect(() => {
    loadPlacements();

    // Слушаем события обновления
    const handleUpdate = () => loadPlacements();
    window.addEventListener('adPlacementsUpdated', handleUpdate);
    return () => window.removeEventListener('adPlacementsUpdated', handleUpdate);
  }, []);

  // Статистика
  const stats = {
    total: placements.length,
    enabled: placements.filter(ad => ad.enabled).length,
    disabled: placements.filter(ad => !ad.enabled).length,
    new: placements.filter(ad => ad.status === 'new').length,
    desktop: placements.filter(ad => ad.device === 'desktop').length,
    mobile: placements.filter(ad => ad.device === 'mobile').length,
  };

  // Фильтрация
  const getFilteredPlacements = () => {
    let filtered = placements;
    
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(ad => 
        ad.device === selectedDevice || ad.device === 'both'
      );
    }
    
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

  // Toggle enabled/disabled
  const handleToggle = (id: string) => {
    const success = toggleAdPlacement(id);
    if (success) {
      loadPlacements();
      showToast('✅ Изменения сохранены');
    }
  };

  // Изменение приоритета
  const handlePriorityChange = (id: string, priority: number) => {
    const success = updateAdPriority(id, priority);
    if (success) {
      loadPlacements();
    }
  };

  // Сброс к дефолту
  const handleReset = () => {
    if (confirm('Вы уверены? Все изменения будут сброшены к дефолтной конфигурации.')) {
      const success = resetToDefaults();
      if (success) {
        loadPlacements();
        showToast('✅ Конфигурация сброшена к дефолту');
      }
    }
  };

  // Export
  const handleExport = () => {
    const config = exportConfig();
    navigator.clipboard.writeText(config);
    showToast('📋 Конфигурация скопирована в буфер обмена');
    setShowExportModal(true);
  };

  // Import
  const handleImport = () => {
    try {
      const success = importConfig(importText);
      if (success) {
        loadPlacements();
        setShowImportModal(false);
        setImportText('');
        showToast('✅ Конфигурация импортирована');
      } else {
        showToast('❌ Ошибка: неверный формат JSON', true);
      }
    } catch (error) {
      showToast('❌ Ошибка импорта', true);
    }
  };

  // Toast уведомления
  const showToast = (message: string, isError = false) => {
    // Простая реализация toast
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${isError ? '#ef4444' : '#10b981'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      font-weight: 500;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

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
  const copyCode = (placeId: string, format: string, placement: string) => {
    const code = `<UniversalAd 
  placeId="${placeId}" 
  format="${format}"
  placement="${placement}"
/>`;
    navigator.clipboard.writeText(code);
    showToast('📋 Код скопирован');
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Управление рекламой {isCustomConfig && <span className="text-sm text-blue-600 dark:text-blue-400">(Custom Config)</span>}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time управление всеми рекламными местами через localStorage
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              ➕ Добавить место
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              📤 Export
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              📥 Import
            </button>
            {isCustomConfig && (
              <button 
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                🔄 Reset
              </button>
            )}
          </div>
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
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.new}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Новых</div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Поиск по названию, описанию или PlaceID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getDeviceIcon(ad.device)} {ad.name}
                  </h3>
                  {getStatusBadge(ad.status)}
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ad.enabled}
                      onChange={() => handleToggle(ad.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {ad.enabled ? '✅ Включено' : '⏸️ Отключено'}
                    </span>
                  </label>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {ad.description}
                </p>

                {/* Детали */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                    <span className="text-gray-500 dark:text-gray-400">Локация:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">{ad.location}</div>
                  </div>
                </div>

                {/* Приоритет Slider */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Приоритет: <span className="text-blue-600 dark:text-blue-400 font-bold">{ad.priority}/10</span>
                    </label>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={ad.priority}
                    onChange={(e) => handlePriorityChange(ad.id, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Действия */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => copyCode(ad.placeId, ad.format, ad.placement)}
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
          ℹ️ Как управлять рекламой (v7.7.0)
        </h3>
        <ul className="space-y-2 text-blue-800 dark:text-blue-300">
          <li><strong>Toggle переключатель:</strong> Включить/выключить место мгновенно</li>
          <li><strong>Слайдер приоритета:</strong> Изменить приоритет от 1 до 10</li>
          <li><strong>➕ Добавить место:</strong> Создать новое рекламное место</li>
          <li><strong>📤 Export:</strong> Экспортировать конфигурацию в JSON</li>
          <li><strong>📥 Import:</strong> Импортировать конфигурацию из JSON</li>
          <li><strong>🔄 Reset:</strong> Сбросить к дефолтным настройкам</li>
          <li><strong>💾 Автосохранение:</strong> Все изменения сохраняются в localStorage автоматически</li>
        </ul>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📤 Export конфигурации</h3>
            <textarea
              readOnly
              value={exportConfig()}
              className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportConfig());
                  showToast('📋 Скопировано в буфер обмена');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📋 Копировать
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📥 Import конфигурации</h3>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Вставьте JSON конфигурацию..."
              className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✅ Импортировать
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
