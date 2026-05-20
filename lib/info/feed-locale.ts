/**
 * v10.11.0: helpers for the per-locale feed-title feature.
 *
 * Why a helper file: both server (lib/info/data.ts) and client (FeedColumn.tsx)
 * need the same fallback logic. Keep it as a one-line pure function to make
 * the contract obvious — IDE jump-to-definition is enough documentation.
 */

import type { InfoFeed } from './types';

/**
 * Pick the localized feed title for the given locale.
 * Falls back to the canonical `title` field if the locale-specific column
 * is null/empty — this keeps existing feeds working until admin fills them in.
 *
 * @param feed   Any object with title + optional title_en / title_pl.
 * @param locale 'en' or 'pl' (string, but extensible to other locales).
 */
export function localizedFeedTitle(
  feed: Pick<InfoFeed, 'title' | 'title_en' | 'title_pl'>,
  locale: string,
): string {
  if (locale === 'pl' && feed.title_pl && feed.title_pl.trim()) return feed.title_pl;
  if (locale === 'en' && feed.title_en && feed.title_en.trim()) return feed.title_en;
  return feed.title;
}
