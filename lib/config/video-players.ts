/**
 * VIDEO PLAYERS CONFIGURATION v10.1.0
 *
 * Only DSP preroll players are supported.
 * VOX PlaceIDs removed — they caused Chrome freeze via MutationObserver loops.
 *
 * @version 10.1.0
 */

export type VideoPlayerType = 'instream' | 'outstream';
export type VideoPlayerPosition =
  | 'article-end'
  | 'article-middle'
  | 'sidebar-sticky'
  | 'in-content';

export interface VideoPlayerConfig {
  id: string;
  name: string;
  type: VideoPlayerType;
  position: VideoPlayerPosition;
  voxPlaceId?: string;
  videoUrl?: string;
  videoPlaylist?: string[];
  adTagUrl?: string;
  adTagPlaylist?: string[];
  enabled: boolean;
  autoplay: boolean;
  muted: boolean;
  device: 'desktop' | 'mobile' | 'all';
  description: string;
}

const DEFAULT_DSP_PREROLL_AD_TAG =
  process.env.NEXT_PUBLIC_DSP_PREROLL_AD_TAG ||
  'https://ssp.hybrid.ai/?sKFoyZmDLeuKiI+KoajZYLWIx8rE3Y7V3QOnqIDJDcL11YVST0NUYKQtJ5Y5zw/Sd1ZIeA9rtoRkIQWE2uCpo20QOOBuBrWgNaAPT9Qe/cM=';

const VIDEO_ENABLED = process.env.NEXT_PUBLIC_VIDEO_PREROLL_ENABLED === 'true';

export const VIDEO_PLAYERS: VideoPlayerConfig[] = [
  {
    id: 'instream-article-end',
    name: 'Preroll Ad (Article End)',
    type: 'instream',
    position: 'article-end',
    adTagUrl: DEFAULT_DSP_PREROLL_AD_TAG,
    enabled: VIDEO_ENABLED,
    autoplay: false,
    muted: true,
    device: 'all',
    description: 'DSP preroll ad player at article end. Resolves VAST → MP4.',
  },
];

export function getVideoPlayerById(id: string): VideoPlayerConfig | undefined {
  return VIDEO_PLAYERS.find((p) => p.id === id);
}

export function getVideoPlayersByDevice(device: 'desktop' | 'mobile' | 'all'): VideoPlayerConfig[] {
  if (device === 'all') return VIDEO_PLAYERS.filter((p) => p.enabled);
  return VIDEO_PLAYERS.filter((p) => p.enabled && (p.device === device || p.device === 'all'));
}

export function getInstreamPlayers(): VideoPlayerConfig[] {
  return VIDEO_PLAYERS.filter((p) => p.enabled && p.type === 'instream');
}

export function getOutstreamPlayers(): VideoPlayerConfig[] {
  return VIDEO_PLAYERS.filter((p) => p.enabled && p.type === 'outstream');
}

export function getVideoPlayersStats() {
  return {
    total: VIDEO_PLAYERS.length,
    enabled: VIDEO_PLAYERS.filter((p) => p.enabled).length,
    instream: VIDEO_PLAYERS.filter((p) => p.type === 'instream').length,
    outstream: VIDEO_PLAYERS.filter((p) => p.type === 'outstream').length,
  };
}
