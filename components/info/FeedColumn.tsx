'use client';

import { useState } from 'react';
import type { InfoFeed, InfoFeedItem } from '@/lib/info/types';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FeedColumn({ feed }: { feed: InfoFeed & { items: InfoFeedItem[] } }) {
  const [hoveredItem, setHoveredItem] = useState<InfoFeedItem | null>(null);

  const lastPostTime = feed.items[0]?.published_at;

  return (
    <div className="bg-white dark:bg-[#16213e] rounded-lg p-4 border border-gray-100 dark:border-gray-700/50">
      {/* Feed Header */}
      <div className="flex items-center gap-2 mb-3">
        {feed.icon_url ? (
          <img src={feed.icon_url} alt="" className="w-5 h-5 rounded" />
        ) : (
          <div className="w-5 h-5 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
            {feed.title[0]}
          </div>
        )}
        <a
          href={feed.site_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sm text-[#333] dark:text-[#e0e0e0] hover:underline truncate"
        >
          {feed.title}
        </a>
        {lastPostTime && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto whitespace-nowrap">
            {timeAgo(lastPostTime)}
          </span>
        )}
      </div>

      {/* Articles List */}
      {feed.items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No items yet</p>
      ) : (
        <ul className="space-y-1.5">
          {feed.items.map((item) => (
            <li key={item.id} className="relative group">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400
                           line-clamp-2 leading-snug transition-colors block"
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {item.title}
              </a>

              {/* Tooltip */}
              {hoveredItem?.id === item.id && (item.description || item.image_url) && (
                <div className="absolute left-full top-0 ml-2 z-50 w-72 bg-white dark:bg-[#0f3460] rounded-lg shadow-xl
                                border border-gray-200 dark:border-gray-600 p-3 pointer-events-none">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <p className="text-sm font-medium text-[#333] dark:text-[#e0e0e0] mb-1">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                      {item.description}
                    </p>
                  )}
                  {item.published_at && (
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(item.published_at)}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
