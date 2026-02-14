'use client';

import { Fragment, useMemo } from 'react';
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
  const insertionTargets = Math.max(adsDesktop.length, adsMobile.length);

  // Разбиваем контент на сегменты и вставляем рекламу между ними.
  const { segments, insertions } = useMemo(() => {
    if (!content) {
      return { segments: [''], insertions: 0 };
    }

    if (insertionTargets === 0) {
      return { segments: [content], insertions: 0 };
    }

    const blocks = content.split(/(<\/p>|<\/h[1-6]>|<\/ul>|<\/ol>|<\/blockquote>)/gi);
    if (blocks.length < 8) {
      return { segments: [content], insertions: 0 };
    }

    // Не более 2 врезок на страницу, чтобы мобильная лента не была агрессивной.
    const desiredInsertions = Math.min(insertionTargets, 2);
    const maxByContent = blocks.length >= 16 ? desiredInsertions : 1;

    const cutPoints = Array.from({ length: maxByContent }, (_, index) => {
      const raw = Math.floor((blocks.length * (index + 1)) / (maxByContent + 1));
      return Math.min(Math.max(4, raw), blocks.length - 4);
    });

    const normalizedCuts = Array.from(new Set(cutPoints)).sort((a, b) => a - b);
    if (normalizedCuts.length === 0) {
      return { segments: [content], insertions: 0 };
    }

    const builtSegments: string[] = [];
    let cursor = 0;

    normalizedCuts.forEach((cut) => {
      builtSegments.push(blocks.slice(cursor, cut).join(''));
      cursor = cut;
    });

    builtSegments.push(blocks.slice(cursor).join(''));

    return {
      segments: builtSegments,
      insertions: normalizedCuts.length,
    };
  }, [content, insertionTargets]);

  if (insertions === 0) {
    return (
      <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }

  return (
    <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
      {segments.map((segment, index) => {
        const desktopAd = adsDesktop[index];
        const mobileAd = adsMobile[index];
        const shouldRenderAd = index < insertions;

        return (
          <Fragment key={`segment-${index}`}>
            <div dangerouslySetInnerHTML={{ __html: segment }} />

            {shouldRenderAd && (
              <>
                {desktopAd && (
                  <div className="hidden xl:block my-8 not-prose">
                    <UniversalAd
                      placeId={desktopAd.placeId}
                      format={desktopAd.format}
                      placement={desktopAd.placement}
                      enabled={desktopAd.enabled}
                    />
                  </div>
                )}

                {mobileAd && (
                  <div className="xl:hidden my-6 not-prose">
                    <UniversalAd
                      placeId={mobileAd.placeId}
                      format={mobileAd.format}
                      placement={mobileAd.placement}
                      enabled={mobileAd.enabled}
                    />
                  </div>
                )}
              </>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
