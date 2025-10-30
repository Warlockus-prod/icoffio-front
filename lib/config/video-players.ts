/**
 * VIDEO PLAYERS CONFIGURATION v7.9.0
 * 
 * Конфигурация видео плееров с рекламой для статей
 * 
 * @version 7.9.0
 * @date 2025-10-30
 */

import { VideoPlayerType, VideoPlayerPosition } from '@/components/VideoPlayer';

export interface VideoPlayerConfig {
  id: string;
  name: string;
  type: VideoPlayerType;
  position: VideoPlayerPosition;
  voxPlaceId: string;            // VOX Display PlaceID для рекламы
  enabled: boolean;
  autoplay: boolean;
  muted: boolean;
  device: 'desktop' | 'mobile' | 'all';
  description: string;
}

/**
 * Конфигурация всех видео плееров
 */
export const VIDEO_PLAYERS: VideoPlayerConfig[] = [
  // === INSTREAM ПЛЕЕРЫ (с видео контентом) ===
  {
    id: 'instream-article-end',
    name: 'Instream Video (Article End)',
    type: 'instream',
    position: 'article-end',
    voxPlaceId: '68f70a1c810d98e1a08f2740', // TODO: Заменить на реальный VOX PlaceID
    enabled: true,
    autoplay: false,
    muted: true,
    device: 'all',
    description: 'Видео плеер с рекламой в конце статьи (Preroll + Midroll + Postroll)'
  },
  {
    id: 'instream-article-middle',
    name: 'Instream Video (Article Middle)',
    type: 'instream',
    position: 'article-middle',
    voxPlaceId: '68f70a1c810d98e1a08f2741', // TODO: Заменить на реальный VOX PlaceID
    enabled: false, // Отключен по умолчанию (может мешать чтению)
    autoplay: false,
    muted: true,
    device: 'all',
    description: 'Видео плеер с рекламой в середине статьи'
  },

  // === OUTSTREAM ПЛЕЕРЫ (только реклама) ===
  {
    id: 'outstream-sidebar',
    name: 'Outstream Ad (Sidebar Sticky)',
    type: 'outstream',
    position: 'sidebar-sticky',
    voxPlaceId: '68f70a1c810d98e1a08f2742', // TODO: Заменить на реальный VOX PlaceID
    enabled: true,
    autoplay: true,
    muted: true,
    device: 'desktop',
    description: 'Sticky рекламный блок справа (autoplay on scroll, desktop only)'
  },
  {
    id: 'outstream-content-mobile',
    name: 'Outstream Ad (In-Content Mobile)',
    type: 'outstream',
    position: 'in-content',
    voxPlaceId: '68f70a1c810d98e1a08f2743', // TODO: Заменить на реальный VOX PlaceID
    enabled: true,
    autoplay: true,
    muted: true,
    device: 'mobile',
    description: 'Рекламный блок между параграфами (autoplay on scroll, mobile only)'
  }
];

/**
 * Получить плеер по ID
 */
export function getVideoPlayerById(id: string): VideoPlayerConfig | undefined {
  return VIDEO_PLAYERS.find(p => p.id === id);
}

/**
 * Получить плееры по устройству
 */
export function getVideoPlayersByDevice(device: 'desktop' | 'mobile' | 'all'): VideoPlayerConfig[] {
  if (device === 'all') {
    return VIDEO_PLAYERS.filter(p => p.enabled);
  }
  return VIDEO_PLAYERS.filter(p => p.enabled && (p.device === device || p.device === 'all'));
}

/**
 * Получить активные instream плееры
 */
export function getInstreamPlayers(): VideoPlayerConfig[] {
  return VIDEO_PLAYERS.filter(p => p.enabled && p.type === 'instream');
}

/**
 * Получить активные outstream плееры
 */
export function getOutstreamPlayers(): VideoPlayerConfig[] {
  return VIDEO_PLAYERS.filter(p => p.enabled && p.type === 'outstream');
}

/**
 * Статистика плееров
 */
export function getVideoPlayersStats() {
  return {
    total: VIDEO_PLAYERS.length,
    enabled: VIDEO_PLAYERS.filter(p => p.enabled).length,
    instream: VIDEO_PLAYERS.filter(p => p.type === 'instream').length,
    outstream: VIDEO_PLAYERS.filter(p => p.type === 'outstream').length,
    desktop: VIDEO_PLAYERS.filter(p => p.device === 'desktop').length,
    mobile: VIDEO_PLAYERS.filter(p => p.device === 'mobile').length
  };
}

/**
 * Рекомендации по размещению видео
 */
export const VIDEO_PLACEMENT_RECOMMENDATIONS = {
  'article-end': {
    pros: [
      'Не мешает чтению статьи',
      'Высокий engagement после прочтения',
      'Подходит для связанного видео контента'
    ],
    cons: [
      'Многие не доскролят до конца',
      'Меньше показов'
    ],
    recommended: true
  },
  'article-middle': {
    pros: [
      'Больше показов',
      'Пользователь еще активен'
    ],
    cons: [
      'Может мешать чтению',
      'Раздражающий фактор'
    ],
    recommended: false
  },
  'sidebar-sticky': {
    pros: [
      'Всегда в поле зрения',
      'Не мешает контенту',
      'Высокий CTR'
    ],
    cons: [
      'Только desktop',
      'Может быть навязчивым'
    ],
    recommended: true
  },
  'in-content': {
    pros: [
      'Естественная интеграция',
      'Высокая видимость',
      'Mobile-friendly'
    ],
    cons: [
      'Прерывает чтение'
    ],
    recommended: true
  }
};

