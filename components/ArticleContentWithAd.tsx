'use client';

import { useMemo } from 'react';
import { UniversalAd } from './UniversalAd';
import type { AdPlacementConfig } from '@/lib/config/adPlacements';

interface ArticleContentWithAdProps {
  content: string;
  adsDesktop: AdPlacementConfig[];
  adsMobile: AdPlacementConfig[];
}

/**
 * Компонент статьи с рекламой в середине текста
 * Вставляет баннер после ~40% контента (примерно в середине)
 */
export function ArticleContentWithAd({ 
  content, 
  adsDesktop, 
  adsMobile 
}: ArticleContentWithAdProps) {
  
  // Разбиваем контент на две части для вставки рекламы в середину
  const { firstPart, secondPart } = useMemo(() => {
    if (!content) {
      return { firstPart: '', secondPart: '' };
    }

    // Ищем все параграфы и заголовки
    const blocks = content.split(/(<\/p>|<\/h[1-6]>|<\/ul>|<\/ol>|<\/blockquote>)/gi);
    
    if (blocks.length < 4) {
      // Слишком короткий контент - не вставляем рекламу в середину
      return { firstPart: content, secondPart: '' };
    }

    // Находим точку примерно на 40% контента (после 2-3 блоков)
    const totalBlocks = blocks.length;
    const splitPoint = Math.floor(totalBlocks * 0.4);
    
    // Убеждаемся что splitPoint минимум 4 (2 блока с закрывающими тегами)
    const actualSplitPoint = Math.max(4, splitPoint);
    
    const first = blocks.slice(0, actualSplitPoint).join('');
    const second = blocks.slice(actualSplitPoint).join('');

    return { firstPart: first, secondPart: second };
  }, [content]);

  // Если контент слишком короткий - показываем без рекламы в середине
  if (!secondPart) {
    return (
      <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }

  return (
    <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
      {/* Первая часть контента (~40%) */}
      <div dangerouslySetInnerHTML={{ __html: firstPart }} />
      
      {/* Реклама в середине текста - Desktop */}
      {adsDesktop.map((ad) => (
        <div key={ad.id} className="hidden md:block my-8 not-prose"> {/* ✅ v8.7.6: md:block вместо lg:block */}
          <UniversalAd 
            placeId={ad.placeId} 
            format={ad.format}
            placement={ad.placement}
            enabled={ad.enabled}
          />
        </div>
      ))}
      
      {/* Реклама в середине текста - Mobile */}
      {adsMobile.map((ad) => (
        <div key={ad.id} className="md:hidden my-6 not-prose"> {/* ✅ v8.7.6: md:hidden вместо lg:hidden */}
          <UniversalAd 
            placeId={ad.placeId} 
            format={ad.format}
            placement={ad.placement}
            enabled={ad.enabled}
          />
        </div>
      ))}
      
      {/* Вторая часть контента (~60%) */}
      <div dangerouslySetInnerHTML={{ __html: secondPart }} />
    </div>
  );
}

