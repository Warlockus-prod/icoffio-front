/**
 * Ad Placements Manager - Real-time управление рекламными местами
 * Система сохраняет изменения в localStorage для мгновенного применения
 * 
 * @version 7.7.0
 * @date 2025-10-28
 */

import { AD_PLACEMENTS, AdPlacementConfig } from './adPlacements';

const STORAGE_KEY = 'icoffio_ad_placements_config';

/**
 * Получить конфигурацию рекламных мест (из localStorage или дефолтную)
 */
export function getAdPlacements(): AdPlacementConfig[] {
  if (typeof window === 'undefined') {
    return AD_PLACEMENTS;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Мержим с дефолтной конфигурацией на случай новых полей
      return AD_PLACEMENTS.map(defaultAd => {
        const savedAd = parsed.find((ad: AdPlacementConfig) => ad.id === defaultAd.id);
        return savedAd ? { ...defaultAd, ...savedAd } : defaultAd;
      });
    }
  } catch (error) {
    console.error('Error reading ad placements from localStorage:', error);
  }

  return AD_PLACEMENTS;
}

/**
 * Сохранить конфигурацию в localStorage
 */
export function saveAdPlacements(placements: AdPlacementConfig[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    // Диспатчим событие для обновления других компонентов
    window.dispatchEvent(new CustomEvent('adPlacementsUpdated'));
    return true;
  } catch (error) {
    console.error('Error saving ad placements to localStorage:', error);
    return false;
  }
}

/**
 * Обновить одно рекламное место
 */
export function updateAdPlacement(id: string, updates: Partial<AdPlacementConfig>): boolean {
  const placements = getAdPlacements();
  const index = placements.findIndex(ad => ad.id === id);
  
  if (index === -1) {
    return false;
  }

  placements[index] = { ...placements[index], ...updates };
  return saveAdPlacements(placements);
}

/**
 * Toggle enabled/disabled для рекламного места
 */
export function toggleAdPlacement(id: string): boolean {
  const placements = getAdPlacements();
  const ad = placements.find(ad => ad.id === id);
  
  if (!ad) {
    return false;
  }

  return updateAdPlacement(id, { enabled: !ad.enabled });
}

/**
 * Изменить приоритет рекламного места
 */
export function updateAdPriority(id: string, priority: number): boolean {
  if (priority < 1 || priority > 10) {
    return false;
  }

  return updateAdPlacement(id, { priority });
}

/**
 * Добавить новое рекламное место
 */
export function addAdPlacement(placement: AdPlacementConfig): boolean {
  const placements = getAdPlacements();
  
  // Проверяем что ID уникален
  if (placements.some(ad => ad.id === placement.id)) {
    console.error('Ad placement with this ID already exists');
    return false;
  }

  placements.push(placement);
  return saveAdPlacements(placements);
}

/**
 * Удалить рекламное место
 */
export function deleteAdPlacement(id: string): boolean {
  const placements = getAdPlacements();
  const filtered = placements.filter(ad => ad.id !== id);
  
  if (filtered.length === placements.length) {
    return false; // ID не найден
  }

  return saveAdPlacements(filtered);
}

/**
 * Сбросить к дефолтной конфигурации
 */
export function resetToDefaults(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('adPlacementsUpdated'));
    return true;
  } catch (error) {
    console.error('Error resetting ad placements:', error);
    return false;
  }
}

/**
 * Проверить есть ли сохраненная конфигурация
 */
export function hasCustomConfig(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Экспортировать конфигурацию в JSON
 */
export function exportConfig(): string {
  const placements = getAdPlacements();
  return JSON.stringify(placements, null, 2);
}

/**
 * Импортировать конфигурацию из JSON
 */
export function importConfig(json: string): boolean {
  try {
    const placements = JSON.parse(json);
    
    // Валидация структуры
    if (!Array.isArray(placements)) {
      throw new Error('Invalid format: expected array');
    }

    // Проверяем что все поля присутствуют
    for (const ad of placements) {
      if (!ad.id || !ad.placeId || !ad.format) {
        throw new Error('Invalid ad placement structure');
      }
    }

    return saveAdPlacements(placements);
  } catch (error) {
    console.error('Error importing config:', error);
    return false;
  }
}


