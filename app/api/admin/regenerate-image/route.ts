/**
 * IMAGE REGENERATION API v7.8.0
 * 
 * API для регенерации изображений статей с поддержкой:
 * - Smart AI prompts через GPT-4
 * - Кастомные промпты и теги
 * - DALL-E и Unsplash источники
 * - Сохранение метаданных
 * 
 * @version 7.8.0
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  generateSmartImagePrompts, 
  buildUnsplashQueryFromTags 
} from '@/lib/smart-image-prompt-generator';
import { 
  generateArticleImage, 
  getUnsplashImage 
} from '@/lib/image-generation-service';
import {
  ImageRegenerationRequest,
  ImageRegenerationResponse,
  ImageMetadata,
  createDefaultImageMetadata
} from '@/lib/types/image-metadata';
import { buildSiteUrl } from '@/lib/site-url';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface PublishedArticleRow {
  id: number;
  title: string;
  category: string | null;
  content_en: string | null;
  content_pl: string | null;
  excerpt_en: string | null;
  excerpt_pl: string | null;
  slug_en: string | null;
  slug_pl: string | null;
  image_url: string | null;
}

interface ResolvedArticleData {
  id: string;
  publishedArticleId?: number;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  slugEn?: string;
  slugPl?: string;
  imageUrl?: string;
  source: 'published_articles' | 'request-fallback';
}

/**
 * POST /api/admin/regenerate-image
 * 
 * Body: ImageRegenerationRequest
 * Returns: ImageRegenerationResponse
 */
export async function POST(request: NextRequest) {
  try {
    const body: ImageRegenerationRequest = await request.json();

    const {
      articleId,
      imageType,
      imageIndex,
      source,
      customPrompt,
      customTags,
      useSmartPrompts = true,
      articleTitle,
      articleCategory,
      articleContent,
      articleExcerpt
    } = body;

    // Валидация
    if (!articleId || !imageType || !source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: articleId, imageType, source'
        } as ImageRegenerationResponse,
        { status: 400 }
      );
    }

    console.log(`[RegenerateImage] Regenerating ${imageType} image for article ${articleId} using ${source}`);

    // Загружаем реальные данные статьи (Supabase), с fallback на данные из запроса
    const articleData = await getArticleData({
      articleId,
      articleTitle,
      articleCategory,
      articleContent,
      articleExcerpt
    });

    if (!articleData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found'
        } as ImageRegenerationResponse,
        { status: 404 }
      );
    }

    console.log(
      `[RegenerateImage] Using article source=${articleData.source}, title="${articleData.title}"`
    );

    let imageUrl: string;
    let metadata: ImageMetadata;
    let cost = 0;

    // === ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ ===
    if (source === 'dalle') {
      // DALL-E генерация
      const prompt = customPrompt || await generatePromptForArticle(
        articleData,
        imageType,
        useSmartPrompts
      );

      console.log('[RegenerateImage] Using DALL-E prompt:', prompt);

      const result = await generateArticleImage({
        title: articleData.title,
        excerpt: prompt, // prompt как excerpt
        category: articleData.category,
        style: 'natural' // 'natural' или 'vivid' для DALL-E
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'DALL-E generation failed');
      }

      imageUrl = result.url;
      cost = result.cost || 0;

      metadata = {
        url: imageUrl,
        source: 'dalle',
        dallePrompt: prompt,
        generatedAt: new Date().toISOString(),
        generatedBy: useSmartPrompts ? 'ai-smart' : (customPrompt ? 'manual' : 'auto'),
        alt: `${articleData.title} - ${imageType} image`
      };

    } else if (source === 'unsplash') {
      // Unsplash поиск
      let query: string;
      let tags: string[] = [];
      let metadataTemp: Partial<ImageMetadata> | null = null;

      if (customTags && customTags.length > 0) {
        // Используем кастомные теги
        tags = customTags;
        query = buildUnsplashQueryFromTags(tags);
      } else if (customPrompt) {
        // Используем кастомный промпт как query
        query = customPrompt;
        tags = customPrompt.split(' ').filter(t => t.length > 2);
      } else if (useSmartPrompts) {
        // Генерируем умные промпты через AI
        const smartPrompts = await generateSmartImagePrompts({
          title: articleData.title,
          content: articleData.content || articleData.excerpt || '',
          excerpt: articleData.excerpt || '',
          category: articleData.category
        });

        tags = smartPrompts.unsplashTags;
        query = imageType === 'hero' 
          ? smartPrompts.heroPrompt 
          : smartPrompts.contentPrompts[imageIndex || 0] || smartPrompts.heroPrompt;

        metadataTemp = {
          source: 'unsplash',
          prompt: query,
          unsplashTags: tags,
          keywords: smartPrompts.keywords,
          visualStyle: smartPrompts.visualStyle,
          colorPalette: smartPrompts.colorPalette,
          generatedAt: new Date().toISOString(),
          generatedBy: 'ai-smart',
          alt: `${articleData.title} - ${imageType} image`
        };
      } else {
        // Базовый fallback
        query = `${articleData.title} ${articleData.category}`;
        tags = [articleData.category, ...articleData.title.split(' ').slice(0, 3)];
      }

      console.log('[RegenerateImage] Using Unsplash query:', query);
      console.log('[RegenerateImage] Tags:', tags);

      const result = await getUnsplashImage(query);

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Unsplash search failed');
      }

      imageUrl = result.url;

      // Создаем финальную metadata
      if (metadataTemp) {
        metadata = {
          url: imageUrl,
          ...metadataTemp
        } as ImageMetadata;
      } else {
        metadata = {
          url: imageUrl,
          source: 'unsplash',
          prompt: query,
          unsplashTags: tags,
          generatedAt: new Date().toISOString(),
          generatedBy: customTags ? 'manual' : (useSmartPrompts ? 'ai-smart' : 'auto'),
          alt: `${articleData.title} - ${imageType} image`
        };
      }

    } else if (source === 'custom') {
      // Кастомный URL
      if (!customPrompt) {
        return NextResponse.json(
          {
            success: false,
            error: 'Custom URL is required for custom source'
          } as ImageRegenerationResponse,
          { status: 400 }
        );
      }

      imageUrl = customPrompt;
      metadata = createDefaultImageMetadata(imageUrl, 'custom');
      metadata.generatedBy = 'manual';

    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown image source: ${source}`
        } as ImageRegenerationResponse,
        { status: 400 }
      );
    }

    await persistImageMetadata({
      requestedArticleId: articleId,
      articleData,
      imageType,
      imageIndex,
      metadata
    });

    console.log('[RegenerateImage] ✅ Image regenerated successfully');

    return NextResponse.json({
      success: true,
      newUrl: imageUrl,
      metadata,
      cost
    } as ImageRegenerationResponse);

  } catch (error: any) {
    console.error('[RegenerateImage] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to regenerate image'
      } as ImageRegenerationResponse,
      { status: 500 }
    );
  }
}

/**
 * Генерирует промпт для статьи
 */
async function generatePromptForArticle(
  article: any,
  imageType: 'hero' | 'content',
  useSmartPrompts: boolean
): Promise<string> {
  if (useSmartPrompts) {
    const smartPrompts = await generateSmartImagePrompts({
      title: article.title,
      content: article.content || article.excerpt || '',
      excerpt: article.excerpt || '',
      category: article.category
    });

    return imageType === 'hero' 
      ? smartPrompts.heroPrompt 
      : smartPrompts.contentPrompts[0] || smartPrompts.heroPrompt;
  }

  // Fallback: базовый промпт
  return `${article.title} ${article.category}`;
}

/**
 * Получает данные статьи:
 * 1) из Supabase published_articles по id/slug
 * 2) fallback из параметров запроса (для draft-статей до публикации)
 */
async function getArticleData(params: {
  articleId: string;
  articleTitle?: string;
  articleCategory?: string;
  articleContent?: string;
  articleExcerpt?: string;
}): Promise<ResolvedArticleData | null> {
  const { articleId, articleTitle, articleCategory, articleContent, articleExcerpt } = params;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const row = await findPublishedArticleByReference(supabase, articleId);
      if (row) {
        return {
          id: String(row.id),
          publishedArticleId: row.id,
          title: (row.title || articleTitle || 'Untitled article').trim(),
          content: (row.content_en || row.content_pl || articleContent || '').trim(),
          excerpt: (row.excerpt_en || row.excerpt_pl || articleExcerpt || row.title || '').trim(),
          category: (row.category || articleCategory || 'tech').trim(),
          slugEn: row.slug_en || undefined,
          slugPl: row.slug_pl || undefined,
          imageUrl: row.image_url || undefined,
          source: 'published_articles'
        };
      }
    } catch (error) {
      console.error('[RegenerateImage] Failed to load article from Supabase:', error);
    }
  }

  const fallbackTitle = articleTitle?.trim();
  if (fallbackTitle) {
    return {
      id: articleId,
      title: fallbackTitle,
      content: (articleContent || '').trim(),
      excerpt: (articleExcerpt || fallbackTitle).trim(),
      category: (articleCategory || 'tech').trim(),
      source: 'request-fallback'
    };
  }

  return null;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

function buildReferenceCandidates(reference: string): string[] {
  const normalized = reference.trim().toLowerCase();
  if (!normalized) return [];

  const withoutLangSuffix = normalized.replace(/-(en|pl)$/i, '');
  const candidates = new Set<string>([normalized, withoutLangSuffix]);

  if (!/-en$|-pl$/i.test(normalized)) {
    candidates.add(`${withoutLangSuffix}-en`);
    candidates.add(`${withoutLangSuffix}-pl`);
  }

  return Array.from(candidates).filter(Boolean);
}

async function findPublishedArticleByReference(supabase: SupabaseClient, reference: string) {
  const selectFields = 'id,title,category,content_en,content_pl,excerpt_en,excerpt_pl,slug_en,slug_pl,image_url';

  if (/^\d+$/.test(reference)) {
    const { data, error } = await supabase
      .from('published_articles')
      .select(selectFields)
      .eq('id', Number(reference))
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      return data[0] as PublishedArticleRow;
    }
  }

  const candidates = buildReferenceCandidates(reference);
  for (const candidate of candidates) {
    const { data: bySlugEn, error: bySlugEnError } = await supabase
      .from('published_articles')
      .select(selectFields)
      .eq('slug_en', candidate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (bySlugEnError) {
      throw new Error(bySlugEnError.message);
    }

    if (bySlugEn && bySlugEn.length > 0) {
      return bySlugEn[0] as PublishedArticleRow;
    }

    const { data: bySlugPl, error: bySlugPlError } = await supabase
      .from('published_articles')
      .select(selectFields)
      .eq('slug_pl', candidate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (bySlugPlError) {
      throw new Error(bySlugPlError.message);
    }

    if (bySlugPl && bySlugPl.length > 0) {
      return bySlugPl[0] as PublishedArticleRow;
    }
  }

  return null;
}

async function persistImageMetadata(params: {
  requestedArticleId: string;
  articleData: ResolvedArticleData;
  imageType: 'hero' | 'content';
  imageIndex?: number;
  metadata: ImageMetadata;
}) {
  const { requestedArticleId, articleData, imageType, imageIndex, metadata } = params;
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn('[RegenerateImage] Supabase is not configured, metadata persistence skipped');
    return;
  }

  let hasPersisted = false;
  const criticalErrors: string[] = [];

  // Для hero-изображения синхронизируем image_url в published_articles, если запись существует
  if (articleData.publishedArticleId && imageType === 'hero') {
    const { error: updateError } = await supabase
      .from('published_articles')
      .update({ image_url: metadata.url })
      .eq('id', articleData.publishedArticleId);

    if (updateError) {
      criticalErrors.push(`published_articles update failed: ${updateError.message}`);
    } else {
      hasPersisted = true;
    }
  }

  // История и полные metadata сохраняются в activity_logs.metadata (JSONB)
  const { error: activityError } = await supabase.from('activity_logs').insert([
    {
      user_name: 'Image Regenerator',
      user_source: 'admin',
      action: 'generate_image',
      action_label: `Regenerated ${imageType} image`,
      entity_type: 'article',
      entity_id: articleData.publishedArticleId
        ? String(articleData.publishedArticleId)
        : requestedArticleId,
      entity_title: articleData.title,
      entity_url: articleData.slugEn
        ? buildSiteUrl(`/en/article/${articleData.slugEn}`)
        : null,
      entity_url_pl: articleData.slugPl
        ? buildSiteUrl(`/pl/article/${articleData.slugPl}`)
        : null,
      metadata: {
        requestedArticleId,
        resolvedArticleId: articleData.id,
        imageType,
        imageIndex: typeof imageIndex === 'number' ? imageIndex : null,
        metadata,
        source: articleData.source,
        persistedAt: new Date().toISOString()
      }
    }
  ]);

  if (activityError) {
    // Graceful degradation, если migration еще не применена
    if (activityError.code === '42P01') {
      console.warn('[RegenerateImage] activity_logs table not found, skip metadata history');
    } else {
      criticalErrors.push(`activity_logs insert failed: ${activityError.message}`);
    }
  } else {
    hasPersisted = true;
  }

  if (criticalErrors.length > 0) {
    throw new Error(criticalErrors.join(' | '));
  }

  if (!hasPersisted) {
    console.warn('[RegenerateImage] Metadata persistence skipped (no writable targets found)');
  };
}
