/**
 * Централизованная конфигурация всех рекламных мест VOX Display
 * 
 * Управление: через админ-панель или прямое редактирование этого файла
 * @version 7.6.0
 * @date 2025-10-28
 */

import { AdFormat, AdPlacement } from '@/components/UniversalAd';

export interface AdPlacementConfig {
  id: string;
  placeId: string;
  format: AdFormat;
  placement: AdPlacement;
  name: string;
  description: string;
  location: 'article' | 'homepage' | 'category' | 'global';
  position: 'header' | 'content-top' | 'content-middle' | 'content-bottom' | 'sidebar-top' | 'sidebar-bottom' | 'footer';
  enabled: boolean;
  priority: number; // 1-10, чем выше - тем важнее
  device: 'desktop' | 'mobile' | 'both';
  addedDate: string;
  status: 'stable' | 'new' | 'testing'; // Статус PlaceID от провайдера
}

/**
 * Все рекламные места в системе
 * ВАЖНО: Обновляйте это при добавлении новых PlaceID от VOX
 */
export const AD_PLACEMENTS: AdPlacementConfig[] = [
  // ==================== DESKTOP INLINE ====================
  {
    id: 'desktop-inline-1',
    placeId: '63da9b577bc72f39bc3bfc68',
    format: '728x90',
    placement: 'inline',
    name: 'Leaderboard после заголовка',
    description: '728x90 баннер после заголовка статьи (Desktop)',
    location: 'article',
    position: 'content-top',
    enabled: true,
    priority: 9,
    device: 'desktop',
    addedDate: '2025-01-13',
    status: 'stable'
  },
  {
    id: 'desktop-inline-2-before-related',
    placeId: '63daa3c24d506e16acfd2a38',
    format: '970x250',
    placement: 'inline',
    name: 'Large Leaderboard перед Related Articles',
    description: '970x250 баннер перед блоком похожих статей (Desktop) - FULL WIDTH',
    location: 'article',
    position: 'footer',
    enabled: true,
    priority: 8,
    device: 'desktop',
    addedDate: '2025-01-13',
    status: 'stable'
  },

  // ==================== SIDEBAR ====================
  {
    id: 'sidebar-1',
    placeId: '63da9e2a4d506e16acfd2a36',
    format: '300x250',
    placement: 'sidebar',
    name: 'Medium Rectangle сверху сайдбара',
    description: '300x250 баннер в верхней части сайдбара (Desktop)',
    location: 'article',
    position: 'sidebar-top',
    enabled: true,
    priority: 10,
    device: 'desktop',
    addedDate: '2025-01-13',
    status: 'stable'
  },
  {
    id: 'sidebar-2',
    placeId: '63daa2ea7bc72f39bc3bfc72',
    format: '300x600',
    placement: 'sidebar',
    name: 'Large Skyscraper снизу сайдбара',
    description: '300x600 баннер в нижней части сайдбара (Desktop)',
    location: 'article',
    position: 'sidebar-bottom',
    enabled: true,
    priority: 7,
    device: 'desktop',
    addedDate: '2025-01-13',
    status: 'stable'
  },

  // ==================== MOBILE BANNERS ====================
  {
    id: 'mobile-1',
    placeId: '68f644dc70e7b26b58596f34',
    format: '320x50',
    placement: 'mobile',
    name: 'Mobile Banner Top',
    description: '320x50 баннер в верхней части (Mobile)',
    location: 'article',
    position: 'header',
    enabled: true,
    priority: 9,
    device: 'mobile',
    addedDate: '2025-10-28',
    status: 'new'
  },
  {
    id: 'mobile-2',
    placeId: '68f645bf810d98e1a08f272f',
    format: '320x100',
    placement: 'mobile',
    name: 'Large Mobile Banner',
    description: '320x100 баннер после контента (Mobile)',
    location: 'article',
    position: 'content-bottom',
    enabled: true,
    priority: 8,
    device: 'mobile',
    addedDate: '2025-10-28',
    status: 'new'
  },
  {
    id: 'mobile-3',
    placeId: '68f6451d810d98e1a08f2725',
    format: '160x600',
    placement: 'mobile',
    name: 'Wide Skyscraper Mobile',
    description: '160x600 вертикальный баннер (Mobile) - в середине контента',
    location: 'article',
    position: 'content-middle',
    enabled: true, // ВКЛЮЧЕН: показывается только на mobile (фильтр device === 'mobile')
    priority: 6,
    device: 'mobile',
    addedDate: '2025-10-28',
    status: 'new'
  },

  // ==================== DISPLAY ====================
  {
    id: 'display-1',
    placeId: '68f63437810d98e1a08f26de',
    format: '320x480',
    placement: 'display',
    name: 'Mobile Interstitial',
    description: '320x480 fullscreen banner (Display)',
    location: 'article',
    position: 'content-middle',
    enabled: true,
    priority: 7,
    device: 'mobile',
    addedDate: '2025-10-28',
    status: 'new'
  },

  // ==================== VIDEO ADVERTISING ====================
  // ОТКЛЮЧЕНЫ - требуют отдельной интеграции VOX Video
  // {
  //   id: 'video-1',
  //   placeId: '68f70a1c810d98e1a08f2740',
  //   format: 'video' as any,
  //   placement: 'video' as any,
  //   name: 'Instream Article End',
  //   description: 'Видео реклама в конце статьи (Desktop & Mobile)',
  //   location: 'article',
  //   position: 'content-bottom',
  //   enabled: false,
  //   priority: 10,
  //   device: 'both',
  //   addedDate: '2025-01-13',
  //   status: 'new'
  // },
];

/**
 * Получить все активные рекламные места
 * Использует сохраненную конфигурацию из localStorage если есть
 */
export function getEnabledAdPlacements(): AdPlacementConfig[] {
  // Импортируем динамически чтобы избежать циклических зависимостей
  if (typeof window !== 'undefined') {
    try {
      const { getAdPlacements } = require('./adPlacementsManager');
      return getAdPlacements().filter((ad: AdPlacementConfig) => ad.enabled);
    } catch (error) {
      console.error('Error loading ad placements:', error);
    }
  }
  return AD_PLACEMENTS.filter(ad => ad.enabled);
}

/**
 * Получить рекламные места для конкретной локации
 * Использует сохраненную конфигурацию из localStorage если есть
 */
export function getAdPlacementsByLocation(location: AdPlacementConfig['location']): AdPlacementConfig[] {
  return getEnabledAdPlacements()
    .filter(ad => ad.location === location || ad.location === 'global')
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Получить рекламные места для конкретного устройства
 */
export function getAdPlacementsByDevice(device: 'desktop' | 'mobile'): AdPlacementConfig[] {
  return getEnabledAdPlacements()
    .filter(ad => ad.device === device || ad.device === 'both')
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Получить рекламное место по ID
 */
export function getAdPlacementById(id: string): AdPlacementConfig | undefined {
  return AD_PLACEMENTS.find(ad => ad.id === id);
}

/**
 * Получить рекламные места по позиции
 */
export function getAdPlacementsByPosition(position: AdPlacementConfig['position']): AdPlacementConfig[] {
  return getEnabledAdPlacements()
    .filter(ad => ad.position === position)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Статистика рекламных мест
 */
export function getAdPlacementsStats() {
  return {
    total: AD_PLACEMENTS.length,
    enabled: getEnabledAdPlacements().length,
    disabled: AD_PLACEMENTS.filter(ad => !ad.enabled).length,
    byDevice: {
      desktop: AD_PLACEMENTS.filter(ad => ad.device === 'desktop').length,
      mobile: AD_PLACEMENTS.filter(ad => ad.device === 'mobile').length,
      both: AD_PLACEMENTS.filter(ad => ad.device === 'both').length,
    },
    byStatus: {
      stable: AD_PLACEMENTS.filter(ad => ad.status === 'stable').length,
      new: AD_PLACEMENTS.filter(ad => ad.status === 'new').length,
      testing: AD_PLACEMENTS.filter(ad => ad.status === 'testing').length,
    },
    byLocation: {
      article: AD_PLACEMENTS.filter(ad => ad.location === 'article').length,
      homepage: AD_PLACEMENTS.filter(ad => ad.location === 'homepage').length,
      category: AD_PLACEMENTS.filter(ad => ad.location === 'category').length,
      global: AD_PLACEMENTS.filter(ad => ad.location === 'global').length,
    }
  };
}

