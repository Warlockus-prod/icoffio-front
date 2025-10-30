'use client';

/**
 * ARTICLE VIEW TRACKER
 * 
 * Отслеживает просмотры статей и отправляет данные в Supabase
 */

import { useEffect, useRef } from 'react';

interface ArticleViewTrackerProps {
  articleSlug: string;
}

export function ArticleViewTracker({ articleSlug }: ArticleViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // Отслеживаем только один раз за сессию
    if (trackedRef.current) return;
    if (!articleSlug) return;

    trackedRef.current = true;

    // Небольшая задержка для учета реальных просмотров (не ботов)
    const timeout = setTimeout(() => {
      fetch('/api/analytics/track-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleSlug }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tracked) {
            console.log(`[Analytics] ✅ View tracked: ${articleSlug}`);
          }
        })
        .catch((error) => {
          console.warn('[Analytics] Failed to track view:', error);
        });
    }, 2000); // 2 секунды задержка

    return () => clearTimeout(timeout);
  }, [articleSlug]);

  // Невидимый компонент
  return null;
}





