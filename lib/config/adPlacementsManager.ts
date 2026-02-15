/**
 * Менеджер управления рекламными местами с сохранением в localStorage
 * Позволяет включать/выключать рекламные места без изменения кода
 * 
 * @version 7.23.0
 * @date 2025-01-13
 */

import { AD_PLACEMENTS, AdPlacementConfig } from './adPlacements';

const STORAGE_KEY = 'icoffio_ad_placements_config';

/**
 * Получить конфигурацию рекламных мест
 * Сначала пытается загрузить из localStorage, затем использует дефолтную
 */
export function getAdPlacements(): AdPlacementConfig[] {
  if (typeof window === 'undefined') {
    return AD_PLACEMENTS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Мерджим с дефолтной конфигурацией (на случай если добавились новые PlaceID)
      const merged = AD_PLACEMENTS.map(defaultAd => {
        const storedAd = parsed.find((ad: AdPlacementConfig) => ad.id === defaultAd.id);
        return storedAd || defaultAd;
      });

      // Добавляем новые PlaceID из сохраненной конфигурации, которых нет в дефолтной
      const newAds = parsed.filter((ad: AdPlacementConfig) => 
        !AD_PLACEMENTS.find(defaultAd => defaultAd.id === ad.id)
      );

      return [...merged, ...newAds];
    }
  } catch (error) {
    console.error('Failed to load ad placements from localStorage:', error);
  }

  return AD_PLACEMENTS;
}

/**
 * Сохранить конфигурацию рекламных мест
 */
export function saveAdPlacements(placements: AdPlacementConfig[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    console.log('✅ Ad placements configuration saved successfully');
  } catch (error) {
    console.error('Failed to save ad placements to localStorage:', error);
  }
}

/**
 * Обновить конкретное рекламное место
 */
export function updateAdPlacement(id: string, updates: Partial<AdPlacementConfig>): void {
  const placements = getAdPlacements();
  const updated = placements.map(ad => 
    ad.id === id ? { ...ad, ...updates } : ad
  );
  saveAdPlacements(updated);
}

/**
 * Включить/выключить рекламное место
 */
export function toggleAdPlacement(id: string, enabled: boolean): void {
  updateAdPlacement(id, { enabled });
  console.log(`${enabled ? '✅ Enabled' : '❌ Disabled'} ad placement: ${id}`);
}

/**
 * Сбросить конфигурацию к дефолтной
 */
export function resetAdPlacements(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🔄 Ad placements configuration reset to default');
  } catch (error) {
    console.error('Failed to reset ad placements:', error);
  }
}

/**
 * Получить статистику рекламных мест с учетом сохраненной конфигурации
 */
export function getAdPlacementsStatsFromStorage() {
  const placements = getAdPlacements();
  
  return {
    total: placements.length,
    enabled: placements.filter(ad => ad.enabled).length,
    disabled: placements.filter(ad => !ad.enabled).length,
    byType: {
      display: placements.length, // All current placements are display type
    },
    byDevice: {
      desktop: placements.filter(ad => ad.device === 'desktop').length,
      mobile: placements.filter(ad => ad.device === 'mobile').length,
      both: placements.filter(ad => ad.device === 'both').length,
    },
    byStatus: {
      stable: placements.filter(ad => ad.status === 'stable').length,
      new: placements.filter(ad => ad.status === 'new').length,
      testing: placements.filter(ad => ad.status === 'testing').length,
    },
    enabledByType: {
      display: placements.filter(ad => ad.enabled).length,
    }
  };
}
