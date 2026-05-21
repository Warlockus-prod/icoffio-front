/**
 * v10.11.0: per-locale feed-title helpers (one-line pure functions, server + client safe).
 * v10.13.0: extended to blocks + boards (same fallback semantics).
 *
 * Contract for all helpers: prefer the locale-specific column; fall back to canonical `title`
 * (and `subtitle`) when empty. Keeps existing rows working until admin / GPT fills them in.
 */

import type { InfoFeed, InfoBlock, InfoBoard, InfoFeedItem } from './types';

type LocalizableFeed   = Pick<InfoFeed,  'title' | 'title_en' | 'title_pl'>;
type LocalizableBlock  = Pick<InfoBlock, 'title'> & { title_en?: string | null; title_pl?: string | null };
type LocalizableBoard  = Pick<InfoBoard, 'title' | 'subtitle'> & {
  title_en?: string | null;
  title_pl?: string | null;
  subtitle_en?: string | null;
  subtitle_pl?: string | null;
};
type LocalizableItem   = Pick<InfoFeedItem, 'title'> & { title_en?: string | null; title_pl?: string | null };
type LocalizableItemDesc = Pick<InfoFeedItem, 'description'> & { description_en?: string | null; description_pl?: string | null };

function pickLocalized(canonical: string, en: string | null | undefined, pl: string | null | undefined, locale: string): string {
  if (locale === 'pl' && pl && pl.trim()) return pl;
  if (locale === 'en' && en && en.trim()) return en;
  return canonical;
}

export function localizedFeedTitle(feed: LocalizableFeed, locale: string): string {
  return pickLocalized(feed.title, feed.title_en, feed.title_pl, locale);
}

export function localizedBlockTitle(block: LocalizableBlock, locale: string): string {
  return pickLocalized(block.title, block.title_en, block.title_pl, locale);
}

export function localizedBoardTitle(board: LocalizableBoard, locale: string): string {
  return pickLocalized(board.title, board.title_en, board.title_pl, locale);
}

export function localizedBoardSubtitle(board: LocalizableBoard, locale: string): string | null {
  if (locale === 'pl' && board.subtitle_pl && board.subtitle_pl.trim()) return board.subtitle_pl;
  if (locale === 'en' && board.subtitle_en && board.subtitle_en.trim()) return board.subtitle_en;
  return board.subtitle;
}

/** v10.14.0: feed-item localized title (NULL → fallback to source). */
export function localizedItemTitle(item: LocalizableItem, locale: string): string {
  return pickLocalized(item.title, item.title_en, item.title_pl, locale);
}

/** v10.16.0: feed-item localized description (NULL → fallback to source description). */
export function localizedItemDescription(item: LocalizableItemDesc, locale: string): string | null {
  if (locale === 'pl' && item.description_pl && item.description_pl.trim()) return item.description_pl;
  if (locale === 'en' && item.description_en && item.description_en.trim()) return item.description_en;
  return item.description;
}
