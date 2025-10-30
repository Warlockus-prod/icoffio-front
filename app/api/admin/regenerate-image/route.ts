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

export const runtime = 'nodejs';
export const maxDuration = 60;

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
      useSmartPrompts = true
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

    // Получаем данные статьи (в реальности это будет из базы данных)
    // Пока используем dummy данные для демонстрации
    const articleData = await getArticleData(articleId);

    if (!articleData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found'
        } as ImageRegenerationResponse,
        { status: 404 }
      );
    }

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

    // TODO: Сохранить метаданные в базу данных
    // await saveImageMetadata(articleId, imageType, imageIndex, metadata);

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
 * Получает данные статьи
 * TODO: Заменить на реальный запрос к базе данных
 */
async function getArticleData(articleId: string): Promise<any> {
  // Пока возвращаем dummy данные
  // В продакшене это будет запрос к Supabase или WordPress
  return {
    id: articleId,
    title: 'Sample Article Title',
    content: 'Article content...',
    excerpt: 'Article excerpt...',
    category: 'ai'
  };
}

