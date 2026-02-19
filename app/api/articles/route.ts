/**
 * 🚀 ЕДИНЫЙ API УПРАВЛЕНИЯ СТАТЬЯМИ ICOFFIO
 * Объединяет функциональность n8n-webhook и generate-article
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedArticleService, type ArticleInput } from '@/lib/unified-article-service';
import { urlParserService } from '@/lib/url-parser-service';
// v7.30.0: Centralized content formatting utility
import { formatContentToHtml, escapeHtml, normalizeAiGeneratedText, sanitizeArticleBodyText, sanitizeExcerptText } from '@/lib/utils/content-formatter';
import { evaluateTitlePolicy, TITLE_MAX_LENGTH, TITLE_MIN_LENGTH } from '@/lib/utils/title-policy';
// v8.4.0: Image placement utility
import { placeImagesInContent } from '@/lib/utils/image-placer';
import { injectMonetizationSettingsIntoContent } from '@/lib/monetization-settings';
import { editorialQualityService } from '@/lib/editorial-quality-service';
import { buildSiteUrl } from '@/lib/site-url';
import { appendServerLog } from '@/lib/server-log-store';
import { requireAdminRole, type AdminRole } from '@/lib/admin-auth';

const DEFAULT_PLACEHOLDER_IMAGE_MARKER = 'photo-1485827404703-89b55fcc595e';
const PLACEHOLDER_IMAGE_MARKERS = [
  DEFAULT_PLACEHOLDER_IMAGE_MARKER,
  'photo-1518770660439-4636190af475',
  'photo-1518709268805-4e9042af2176'
];
const isLikelyTemporaryImage = (url?: string): boolean =>
  Boolean(url && /oaidalleapiprod|[?&](st|se|sp|sig)=/i.test(url));
const isPlaceholderImage = (url?: string): boolean =>
  Boolean(
    url &&
      (PLACEHOLDER_IMAGE_MARKERS.some((marker) => url.includes(marker)) ||
        isLikelyTemporaryImage(url))
  );
const MAX_MULTI_SOURCE_URLS = 5;
const MAX_SOURCE_CHARS_PER_URL = 5000;
const MAX_TOTAL_SOURCE_CHARS = 18000;
const MAX_SOURCE_TEXT_CHARS = 6000;
const MAX_MANUAL_TEXT_CHARS = 12000;
const SUPPORTED_CATEGORIES = new Set(['ai', 'apple', 'games', 'tech']);
// WordPress integration is fully decommissioned for VPS-first architecture.
const ENABLE_WORDPRESS_PUBLISH = false;

type SupportedCategory = 'ai' | 'apple' | 'games' | 'tech';

// Поддерживаемые действия
type ActionType = 
  | 'create-from-telegram'  // Для n8n webhook
  | 'create-from-url'       // Для админ панели - парсинг URL
  | 'create-from-text'      // Для админ панели - ручной ввод
  | 'health-check'          // Проверка состояния сервисов
  | 'get-categories'        // Получение доступных категорий
  | 'wordpress-health'      // Диагностика WordPress подключения
  | 'publish-article'       // Публикация готовой статьи
  | 'list-articles'         // Список статей (будущее)
  | 'get-article'           // Получение статьи (будущее)
  | 'update-article'        // Обновление статьи (будущее)
  | 'delete-article';       // Удаление статьи (будущее)

interface ApiRequest {
  action: ActionType;
  data?: any;
  
  // Для совместимости со старыми API
  url?: string;
  title?: string;
  content?: string;
  category?: string;
}

interface MultiSourceDigest {
  compiledContent: string;
  suggestedTitle?: string;
  suggestedCategory: SupportedCategory;
  parsedCount: number;
  warnings: string[];
}

interface SourceAttribution {
  label: string;
  url: string;
}

function truncateText(value: string, maxChars: number): string {
  if (!value) return '';
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}\n\n[truncated]`;
}

function normalizeCategory(input?: string | null, fallback: SupportedCategory = 'tech'): SupportedCategory {
  if (!input) return fallback;
  const normalized = input.toLowerCase().trim();
  if (SUPPORTED_CATEGORIES.has(normalized)) {
    return normalized as SupportedCategory;
  }
  return fallback;
}

function uniqueIssueList(issues: string[]): string[] {
  return Array.from(
    new Set(
      issues
        .map((issue) => String(issue || '').trim())
        .filter(Boolean)
    )
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractSourceUrls(body: ApiRequest): string[] {
  const rawUrls = [
    ...(Array.isArray((body as any).urls) ? (body as any).urls : []),
    ...(Array.isArray(body.data?.urls) ? body.data.urls : []),
    ...(Array.isArray((body as any).sourceUrls) ? (body as any).sourceUrls : []),
    ...(Array.isArray(body.data?.sourceUrls) ? body.data.sourceUrls : []),
    ...(body.url ? [body.url] : []),
    ...(body.data?.url ? [body.data.url] : [])
  ];

  return Array.from(
    new Set(
      rawUrls
        .map((url) => String(url || '').trim())
        .filter(Boolean)
        .filter((url) => isValidHttpUrl(url))
    )
  );
}

async function buildMultiSourceDigest(
  urls: string[],
  requestedCategory?: string | null
): Promise<MultiSourceDigest> {
  const warnings: string[] = [];
  const parsedSources: Array<{
    url: string;
    title: string;
    content: string;
    category: SupportedCategory;
  }> = [];

  for (const sourceUrl of urls) {
    try {
      const extracted = await urlParserService.extractContent(sourceUrl, {
        maxContentLength: MAX_SOURCE_CHARS_PER_URL
      });
      const cleanContent = truncateText(
        (
          sanitizeArticleBodyText(normalizeAiGeneratedText(extracted.content || ''), {
            aggressive: true,
            preserveMonetizationMarker: false,
          }) || normalizeAiGeneratedText(extracted.content || '')
        ).trim(),
        MAX_SOURCE_CHARS_PER_URL
      );

      if (!cleanContent) {
        warnings.push(`Source has no usable content: ${sourceUrl}`);
        continue;
      }

      parsedSources.push({
        url: sourceUrl,
        title: extracted.title || new URL(sourceUrl).hostname,
        content: cleanContent,
        category: normalizeCategory(extracted.category, 'tech')
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      warnings.push(`Failed to parse ${sourceUrl}: ${message}`);
    }
  }

  if (parsedSources.length === 0) {
    return {
      compiledContent: '',
      suggestedTitle: undefined,
      suggestedCategory: normalizeCategory(requestedCategory, 'tech'),
      parsedCount: 0,
      warnings
    };
  }

  let remaining = MAX_TOTAL_SOURCE_CHARS;
  const sourceBlocks: string[] = [];
  parsedSources.forEach((source, index) => {
    if (remaining <= 0) return;
    const allowed = Math.min(MAX_SOURCE_CHARS_PER_URL, remaining);
    const trimmedContent = truncateText(source.content, allowed);
    remaining -= trimmedContent.length;

    sourceBlocks.push(
      `### Source ${index + 1}: ${source.title}\nURL: ${source.url}\n\n${trimmedContent}`
    );
  });

  const combinedTitle = parsedSources.length === 1
    ? parsedSources[0].title
    : `${parsedSources[0].title} + ${parsedSources.length - 1} additional sources`;

  return {
    compiledContent: sourceBlocks.join('\n\n---\n\n'),
    suggestedTitle: combinedTitle,
    suggestedCategory: normalizeCategory(requestedCategory, parsedSources[0].category),
    parsedCount: parsedSources.length,
    warnings
  };
}

// ========== ОСНОВНЫЕ МЕТОДЫ ==========

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body = await request.json() as ApiRequest;
    const { action, data } = body;

    console.log(`📝 API Articles: ${action}`, {
      hasData: !!data,
      timestamp: new Date().toISOString()
    });

    // Проверка авторизации для webhook телеграма
    if (['create-from-telegram'].includes(action)) {
      const authResult = await checkAuthentication(request);
      if (!authResult.success) {
        return NextResponse.json(
          { error: 'Неавторизованный доступ', details: authResult.error },
          { status: 401 }
        );
      }
    }

    // RBAC для админской части API
    const actionRoleMap: Partial<Record<ActionType, AdminRole>> = {
      'create-from-url': 'editor',
      'create-from-text': 'editor',
      'publish-article': 'editor',
      'update-article': 'editor',
      'delete-article': 'editor',
      'list-articles': 'viewer',
      'get-article': 'viewer',
    };

    const requiredRole = actionRoleMap[action];
    if (requiredRole) {
      const auth = await requireAdminRole(request, requiredRole, { allowRefresh: false });
      if (!auth.ok) return auth.response;
    }

    // Маршрутизация по действиям
    switch (action) {
      case 'create-from-telegram':
        return await handleTelegramCreation(data, request);
        
      case 'create-from-url':
        return await handleUrlCreation(body, request);
        
      case 'create-from-text':
        return await handleTextCreation(body, request);
        
      case 'health-check':
        return await handleHealthCheck();
        
      case 'get-categories':
        return await handleGetCategories();

      case 'wordpress-health':
        return await handleWordPressHealth();

      case 'publish-article':
        return await handleArticlePublication(body, request);
        
      default:
        return NextResponse.json(
          { 
            error: 'Неизвестное действие', 
            supportedActions: [
              'create-from-telegram',
              'create-from-url', 
              'create-from-text',
              'health-check',
              'get-categories',
              'wordpress-health',
              'publish-article'
            ]
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ API Articles error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  if (action === 'health-check') {
    return await handleHealthCheck();
  }
  
  if (action === 'categories') {
    return await handleGetCategories();
  }
  
  if (action === 'wordpress-health') {
    return await handleWordPressHealth();
  }
  
  // Документация API
  return NextResponse.json({
    service: 'Unified Articles API',
    version: '2.0.0',
    description: 'Единый API для управления статьями icoffio',
    
    endpoints: {
      'POST /api/articles': {
        'create-from-telegram': {
          description: 'Создание статьи из телеграм сообщения (для n8n)',
          auth: 'Bearer token required',
          data: {
            title: 'string',
            content: 'string', 
            category: 'ai|apple|games|tech (optional)',
            language: 'string (optional, default: ru)',
            author: 'string (optional)',
            chatId: 'string (optional)',
            messageId: 'string (optional)',
          }
        },
        'create-from-url': {
          description: 'Создание статьи из URL (для админ панели)',
          data: {
            url: 'string (required, если urls не передан)',
            urls: 'string[] (optional, до 5 URL для одной статьи)',
            content: 'string (optional, дополнительный контекст от редактора)',
            category: 'ai|apple|games|tech (optional)'
          }
        },
        'create-from-text': {
          description: 'Создание статьи из текста (для админ панели)', 
          data: {
            title: 'string (required)',
            content: 'string (required)',
            sourceUrls: 'string[] (optional, до 5 URL для мульти-анализа)',
            category: 'ai|apple|games|tech (optional)'
          }
        },
        'health-check': {
          description: 'Проверка состояния всех сервисов'
        },
        'get-categories': {
          description: 'Получение списка доступных категорий'
        }
      },
      
      'GET /api/articles': {
        'health-check': '?action=health-check',
        'categories': '?action=categories',
        'wordpress-health (deprecated)': '?action=wordpress-health (returns 410)',
        'documentation': 'Default - this help'
      }
    },
    
    compatibility: {
      'n8n-webhook': 'POST /api/articles with action: create-from-telegram',
      'generate-article': 'POST /api/articles with action: create-from-url or create-from-text'
    },
    
    supportedLanguages: ['ru', 'en', 'pl', 'de', 'ro', 'cs'],
    supportedCategories: ['ai', 'apple', 'games', 'tech'],
    
    features: [
      'content-enhancement',
      'multilingual-translation', 
      'image-generation',
      'supabase-publication',
      'url-content-extraction',
      'telegram-integration',
      'local-storage',
      'health-monitoring'
    ]
  });
}

// ========== ОБРАБОТЧИКИ ДЕЙСТВИЙ ==========

/**
 * Создание статьи из телеграм сообщения (для n8n)
 */
async function handleTelegramCreation(data: any, request: NextRequest) {
  try {
    if (!data || !data.title || !data.content) {
      return NextResponse.json(
        { error: 'Отсутствует заголовок или содержимое статьи' },
        { status: 400 }
      );
    }

    const articleInput: ArticleInput = {
      title: data.title,
      content: data.content,
      category: data.category || 'tech',
      author: data.author || 'AI Assistant',
      language: data.language || 'ru',
      chatId: data.chatId,
      messageId: data.messageId,
      
      // Для телеграм включаем все возможности
      enhanceContent: true,
      generateImage: true,
      translateToAll: true,
      publishToWordPress: ENABLE_WORDPRESS_PUBLISH
    };

    const result = await unifiedArticleService.processArticle(articleInput);

    if (result.success) {
      // Формат ответа для n8n (совместимость)
      return NextResponse.json({
        success: true,
        article: {
          id: result.article!.id,
          slug: result.article!.slug,
          title: result.article!.title,
          content: result.article!.content,
          excerpt: result.article!.excerpt,
          category: result.article!.category,
          language: result.article!.language,
          author: result.article!.author,
          chatId: data.chatId,
          messageId: data.messageId,
          image: result.article!.image,
          publishedAt: result.article!.publishedAt,
          translations: result.article!.translations
        },
        publicationResults: {
          success: result.stats.publishedToWordPress,
          publishedLanguages: Object.keys(result.article!.translations || {}),
          summary: {
            published: result.stats.publishedToWordPress ? result.stats.languagesProcessed : 0,
            failed: result.stats.publishedToWordPress ? 0 : result.stats.languagesProcessed,
            total: result.stats.languagesProcessed
          }
        },
        urls: result.urls,
        stats: result.stats,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Неизвестная ошибка',
        errors: result.errors,
        warnings: result.warnings
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Telegram creation error:', error);
    throw error;
  }
}

/**
 * Создание статьи из URL (для админ панели)
 */
async function handleUrlCreation(body: ApiRequest & { contentStyle?: string }, request: NextRequest) {
  try {
    const sourceUrls = extractSourceUrls(body);
    if (sourceUrls.length === 0) {
      return NextResponse.json(
        { error: 'URL не указан' },
        { status: 400 }
      );
    }
    if (sourceUrls.length > MAX_MULTI_SOURCE_URLS) {
      return NextResponse.json(
        { error: `Можно передать максимум ${MAX_MULTI_SOURCE_URLS} URL за один запрос` },
        { status: 400 }
      );
    }

    // ✅ v8.4.0: Получаем стиль обработки контента
    const rawContentStyle = body.contentStyle || body.data?.contentStyle || 'journalistic';
    const contentStyle = ['journalistic', 'as-is', 'seo-optimized', 'academic', 'casual', 'technical'].includes(rawContentStyle)
      ? rawContentStyle
      : 'journalistic';
    const stage = body.data?.stage || (body as any).stage;
    const enhanceContent = typeof (body as any).enhanceContent === 'boolean'
      ? (body as any).enhanceContent
      : typeof body.data?.enhanceContent === 'boolean'
        ? body.data.enhanceContent
        : contentStyle !== 'as-is';
    const generateImage = typeof (body as any).generateImage === 'boolean'
      ? (body as any).generateImage
      : typeof body.data?.generateImage === 'boolean'
        ? body.data.generateImage
        : true;
    const translateToAll = typeof (body as any).translateToAll === 'boolean'
      ? (body as any).translateToAll
      : typeof body.data?.translateToAll === 'boolean'
        ? body.data.translateToAll
        : true;
    const sourceText = truncateText(
      String((body as any).content || body.data?.content || (body as any).sourceText || body.data?.sourceText || '').trim(),
      MAX_SOURCE_TEXT_CHARS
    );
    const requestedCategory = body.category || body.data?.category;
    const requestedTitle = String(body.title || body.data?.title || '').trim();
    const isMultiSourceRequest = sourceUrls.length > 1 || Boolean(sourceText);
    const sourceWarnings: string[] = [];
    console.log(`📝 Content style requested: ${contentStyle}`);

    let articleInput: ArticleInput;
    let responseInput: Record<string, any>;

    if (isMultiSourceRequest) {
      const digest = await buildMultiSourceDigest(sourceUrls, requestedCategory);
      sourceWarnings.push(...digest.warnings);

      const composedParts: string[] = [];
      if (sourceText) {
        composedParts.push(`### Additional context from editor\n\n${sourceText}`);
      }
      if (digest.compiledContent) {
        composedParts.push(`### Parsed source materials\n\n${digest.compiledContent}`);
      }

      if (composedParts.length === 0) {
        return NextResponse.json(
          { error: 'Не удалось извлечь данные из указанных URL и не передан дополнительный текст' },
          { status: 422 }
        );
      }

      articleInput = {
        title: truncateText(requestedTitle || digest.suggestedTitle || 'Combined source analysis', 180),
        content: composedParts.join('\n\n---\n\n'),
        category: normalizeCategory(requestedCategory, digest.suggestedCategory),
        contentStyle: contentStyle as ArticleInput['contentStyle'],
        stage,
        enhanceContent,
        generateImage,
        translateToAll,
        publishToWordPress: false
      };

      responseInput = {
        urls: sourceUrls,
        sourceCount: sourceUrls.length,
        sourceTextIncluded: Boolean(sourceText),
        parsedSourcesCount: digest.parsedCount
      };
    } else {
      const singleUrl = sourceUrls[0];
      articleInput = {
        url: singleUrl,
        category: normalizeCategory(requestedCategory, 'tech'),
        contentStyle: contentStyle as ArticleInput['contentStyle'],
        stage,
        enhanceContent,
        generateImage,
        translateToAll,
        publishToWordPress: false
      };
      responseInput = { url: singleUrl };
    }

    const result = await unifiedArticleService.processArticle(articleInput);
    const combinedWarnings = [...sourceWarnings, ...(result.warnings || [])];
    const parsedSourceAttributions = result.success
      ? normalizeSourceAttributions((result.article as any)?.sourceAttributions)
      : [];

    if (result.success) {
      // ✅ АВТОМАТИЧЕСКАЯ РЕВАЛИДАЦИЯ СТРАНИЦ после создания статьи
      try {
        const revalidateToken = process.env.REVALIDATE_TOKEN || process.env.REVALIDATE_SECRET;
        if (revalidateToken) {
          await fetch(`${request.nextUrl.origin}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: revalidateToken,
              paths: ['/en/articles', '/pl/articles', '/en/category/' + result.article!.category, '/pl/category/' + result.article!.category]
            })
          });
        }
      } catch (revalError) {
        console.warn('Revalidation failed:', revalError);
      }

      // Формат ответа для админ панели
      return NextResponse.json({
        success: true,
        message: 'Статья успешно создана из URL',
        data: {
          posts: formatPostsForAdmin(result.article!),
          stats: {
            title: result.article!.title,
            category: result.article!.category,
            languages: result.stats.languagesProcessed,
            slug: result.article!.slug,
            excerpt: result.article!.excerpt
          },
          input: responseInput,
          sourceAttributions: parsedSourceAttributions.length > 0 ? parsedSourceAttributions : undefined
        },
        // ✅ ИСПРАВЛЕНИЕ: Передаем imageOptions для выбора нескольких картинок
        imageOptions: (result.article as any).imageOptions || undefined,
        warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined
      });
    } else {
      await appendServerLog('error', 'parser', 'create_from_url_failed', 'Unified article creation from URL failed', {
        input: responseInput,
        error: result.errors?.[0] || 'Unknown error',
        errors: result.errors,
      });
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Неизвестная ошибка',
        errors: result.errors,
        warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ URL creation error:', error);
    await appendServerLog('error', 'parser', 'create_from_url_exception', 'Unhandled exception during URL creation', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Создание статьи из текста (для админ панели)
 */
async function handleTextCreation(body: ApiRequest, request: NextRequest) {
  try {
    const title = String(body.title || body.data?.title || '').trim();
    const content = String(body.content || body.data?.content || '').trim();
    const stage = body.data?.stage || (body as any).stage;
    const enhanceContent = typeof (body as any).enhanceContent === 'boolean'
      ? (body as any).enhanceContent
      : typeof body.data?.enhanceContent === 'boolean'
        ? body.data.enhanceContent
        : true;
    const generateImage = typeof (body as any).generateImage === 'boolean'
      ? (body as any).generateImage
      : typeof body.data?.generateImage === 'boolean'
        ? body.data.generateImage
        : true;
    const translateToAll = typeof (body as any).translateToAll === 'boolean'
      ? (body as any).translateToAll
      : typeof body.data?.translateToAll === 'boolean'
        ? body.data.translateToAll
        : true;
    const sourceUrls = extractSourceUrls(body);
    if (sourceUrls.length > MAX_MULTI_SOURCE_URLS) {
      return NextResponse.json(
        { error: `Можно передать максимум ${MAX_MULTI_SOURCE_URLS} URL за один запрос` },
        { status: 400 }
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Отсутствует заголовок или содержимое' },
        { status: 400 }
      );
    }
    const sourceWarnings: string[] = [];
    let combinedContent = truncateText(content, MAX_MANUAL_TEXT_CHARS);
    let categoryFallback: SupportedCategory = 'tech';

    if (sourceUrls.length > 0) {
      const digest = await buildMultiSourceDigest(sourceUrls, body.category || body.data?.category);
      sourceWarnings.push(...digest.warnings);
      categoryFallback = digest.suggestedCategory;

      if (digest.compiledContent) {
        combinedContent = `${combinedContent}\n\n---\n\n### Reference URLs for additional context\n\n${digest.compiledContent}`;
      }
    }

    const articleInput: ArticleInput = {
      title,
      content: combinedContent,
      category: normalizeCategory(body.category || body.data?.category, categoryFallback),
      stage,
      
      // Для админ панели - все возможности включены
      enhanceContent,
      generateImage,
      translateToAll,
      publishToWordPress: false // В админке пока отключаем автопубликацию
    };

    const result = await unifiedArticleService.processArticle(articleInput);
    const combinedWarnings = [...sourceWarnings, ...(result.warnings || [])];

    if (result.success) {
      // ✅ АВТОМАТИЧЕСКАЯ РЕВАЛИДАЦИЯ СТРАНИЦ после создания статьи
      try {
        const revalidateToken = process.env.REVALIDATE_TOKEN || process.env.REVALIDATE_SECRET;
        if (revalidateToken) {
          await fetch(`${request.nextUrl.origin}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: revalidateToken,
              paths: ['/en/articles', '/pl/articles', '/en/category/' + result.article!.category, '/pl/category/' + result.article!.category]
            })
          });
        }
      } catch (revalError) {
        console.warn('Revalidation failed:', revalError);
      }

      // Формат ответа для админ панели
      return NextResponse.json({
        success: true,
        message: 'Статья успешно создана',
        data: {
          posts: formatPostsForAdmin(result.article!),
          stats: {
            title: result.article!.title,
            category: result.article!.category,
            languages: result.stats.languagesProcessed,
            slug: result.article!.slug,
            excerpt: result.article!.excerpt
          },
          input: { title, category: articleInput.category, sourceUrls, sourceCount: sourceUrls.length }
        },
        warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Неизвестная ошибка',
        errors: result.errors,
        warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Text creation error:', error);
    throw error;
  }
}

/**
 * Проверка здоровья всех сервисов
 */
async function handleHealthCheck() {
  try {
    const servicesHealth = await unifiedArticleService.checkServicesHealth();
    
    return NextResponse.json({
      success: true,
      service: 'Unified Articles API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      
      services: servicesHealth,
      
      environment: {
        configured: true
      },
      
      supportedLanguages: ['ru', 'en', 'pl', 'de', 'ro', 'cs'],
      supportedCategories: ['ai', 'apple', 'games', 'tech'],
      
      features: [
        'unified-architecture',
        'telegram-integration', 
        'intelligent-url-parsing',
        'real-content-extraction',
        'manual-content-input',
        'content-enhancement',
        'multilingual-translation',
        'image-generation',
        'local-storage',
        'health-monitoring'
      ],
      
      endpoints: {
        telegram: 'POST /api/articles { action: "create-from-telegram" }',
        url: 'POST /api/articles { action: "create-from-url", url: "..." }',
        text: 'POST /api/articles { action: "create-from-text", title: "...", content: "..." }'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Получение доступных категорий
 */
async function handleGetCategories() {
  return NextResponse.json({
    success: true,
    categories: [
      { slug: 'ai', name: 'Искусственный интеллект', icon: '🤖', description: 'ИИ, машинное обучение, нейросети' },
      { slug: 'apple', name: 'Apple', icon: '🍎', description: 'Продукты Apple, iOS, macOS' },
      { slug: 'games', name: 'Игры', icon: '🎮', description: 'Видеоигры, киберспорт, игровая индустрия' },
      { slug: 'tech', name: 'Технологии', icon: '⚡', description: 'Общие технологии, гаджеты, инновации' }
    ]
  });
}

/**
 * Расширенная диагностика WordPress подключения
 */
async function handleWordPressHealth() {
  return NextResponse.json(
    {
      success: false,
      service: 'WordPress Integration',
      decommissioned: true,
      message: 'WordPress integration is disabled. Publication flow is Supabase-only.'
    },
    { status: 410 }
  );
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Проверка аутентификации
 */
async function checkAuthentication(request: NextRequest): Promise<{success: boolean; error?: string}> {
  // Проверка webhook secret для n8n
  const webhookSecret = (process.env.N8N_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: 'Webhook secret is not configured'
    };
  }

  if (webhookSecret) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (bearer !== webhookSecret) {
      return {
        success: false,
        error: 'Invalid webhook secret'
      };
    }
  }
  
  return { success: true };
}

/**
 * Форматирование статей для админ панели
 */
function formatPostsForAdmin(article: any): Record<string, any> {
  const posts: Record<string, any> = {};
  
  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Логирование для отладки
  console.log('📋 formatPostsForAdmin - article language:', article.language);
  console.log('📋 formatPostsForAdmin - article title:', article.title?.substring(0, 80));
  console.log('📋 formatPostsForAdmin - translations available:', Object.keys(article.translations || {}));
  
  // Основная статья (всегда EN теперь)
  const normalizedEnContent =
    sanitizeArticleBodyText(normalizeAiGeneratedText(article.content || ''), {
      language: 'en',
      aggressive: true,
      preserveMonetizationMarker: false,
    }) || normalizeAiGeneratedText(article.content || '');
  const normalizedEnExcerpt = sanitizeExcerptText(article.excerpt || article.title || '', 200);
  posts.en = {
    slug: article.slug,
    title: article.title,
    excerpt: normalizedEnExcerpt,
    publishedAt: article.publishedAt,
    image: article.image,
    category: {
      name: article.category,
      slug: article.category
    },
    content: normalizedEnContent,
    contentHtml: formatContentToHtml(normalizedEnContent)
  };
  
  console.log('📋 posts.en.title:', posts.en.title?.substring(0, 80));
  
  // Переводы (только PL поддерживается)
  for (const [lang, translation] of Object.entries(article.translations || {})) {
    if (lang === 'pl') { // Только польский
      const normalizedPlContent =
        sanitizeArticleBodyText(normalizeAiGeneratedText((translation as any).content || ''), {
          language: 'pl',
          aggressive: true,
          preserveMonetizationMarker: false,
        }) || normalizeAiGeneratedText((translation as any).content || '');
      const normalizedPlExcerpt = sanitizeExcerptText(
        (translation as any).excerpt || (translation as any).title || article.excerpt || '',
        200
      );
      posts[lang] = {
        slug: (translation as any).slug,
        title: (translation as any).title,
        excerpt: normalizedPlExcerpt,
        publishedAt: article.publishedAt,
        image: article.image,
        category: {
          name: article.category,
          slug: article.category
        },
        content: normalizedPlContent,
        contentHtml: formatContentToHtml(normalizedPlContent)
      };
      console.log('📋 posts.pl.title:', posts[lang].title?.substring(0, 80));
    }
  }
  
  console.log('📋 Final posts structure:', Object.keys(posts).join(', '));
  return posts;
}

function normalizeSourceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((url) => isValidHttpUrl(url))
    )
  );
}

function sourceHostLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    return hostname || url;
  } catch {
    return url;
  }
}

function normalizeSourceAttributions(value: unknown): SourceAttribution[] {
  const rows = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const items: SourceAttribution[] = [];

  for (const row of rows) {
    const label = String((row as any)?.label || '').trim();
    const url = String((row as any)?.url || '').trim();
    if (!label || !isValidHttpUrl(url)) continue;
    const key = `${label.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ label, url });
    if (items.length >= 8) break;
  }

  return items;
}

function extractSourceAttributionsFromContent(content: string): SourceAttribution[] {
  const text = String(content || '');
  if (!text.trim()) return [];

  const matches: SourceAttribution[] = [];
  const patterns = [
    /(?:источник|source|źr[óo]dł[oa])\s*:\s*\[([^\]]{2,140})\]\((https?:\/\/[^)\s]+)\)/gi,
    /(?:источник|source|źr[óo]dł[oa])\s*:\s*<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]{2,140})<\/a>/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(text)) !== null) {
      const labelFromFirst = match[1] || '';
      const urlFromSecond = match[2] || '';
      const isHtmlPattern = pattern.source.includes('<a');
      const label = isHtmlPattern ? String(match[2] || '').trim() : String(labelFromFirst).trim();
      const url = isHtmlPattern ? String(match[1] || '').trim() : String(urlFromSecond).trim();
      if (!label || !isValidHttpUrl(url)) continue;
      matches.push({ label, url });
      if (matches.length >= 8) break;
    }
    if (matches.length >= 8) break;
  }

  return normalizeSourceAttributions(matches);
}

async function hydrateSourceAttributionsFromUrls(urls: string[]): Promise<SourceAttribution[]> {
  const result: SourceAttribution[] = [];

  for (const sourceUrl of urls.slice(0, 3)) {
    try {
      const extracted = await urlParserService.extractContent(sourceUrl, {
        timeout: 7000,
        maxContentLength: 800,
        includeImages: false,
      });
      const normalized = normalizeSourceAttributions((extracted as any).sourceAttributions);
      if (normalized.length > 0) {
        result.push(...normalized);
      }
      if (result.length >= 8) break;
    } catch (error) {
      console.warn(`[SourceAttribution] Failed to hydrate from ${sourceUrl}`, error);
    }
  }

  return normalizeSourceAttributions(result);
}

function appendSourceAttribution(
  content: string,
  attributions: SourceAttribution[],
  language: 'en' | 'pl'
): string {
  const normalizedContent = (content || '').trim();
  if (!normalizedContent || attributions.length === 0) return normalizedContent;
  if (/^##\s*(sources|źródła)\b/im.test(normalizedContent)) return normalizedContent;

  const heading = language === 'pl' ? '## Źródła' : '## Sources';
  const lines = attributions.map((item) => `- [${item.label}](${item.url})`);

  return `${normalizedContent}\n\n${heading}\n${lines.join('\n')}`.trim();
}

// ✅ v7.30.0: formatContentToHtml and escapeHtml moved to lib/utils/content-formatter.ts
// This eliminates code duplication - now imported at the top of this file

// ========== ПУБЛИКАЦИЯ СТАТЕЙ ==========

async function handleArticlePublication(body: any, request: NextRequest) {
  try {
    const { articleId, article } = body;

    if (!article) {
      return NextResponse.json(
        { error: 'Статья не предоставлена' },
        { status: 400 }
      );
    }

    console.log(`📤 Publishing article: ${article.title}`);

    // 1. КРИТИЧЕСКИ ВАЖНО: Сохраняем в Supabase для персистентности
    // Runtime storage НЕ работает в serverless (каждый запрос на разных серверах!)
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { addRuntimeArticle } = require('@/lib/local-articles');
    
    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Генерируем slug С СУФФИКСАМИ (система требует!)
    const generateSlug = (title: string): string => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
    };
    
    const rawBaseSlug = article.slug || generateSlug(article.title);
    const baseSlug = rawBaseSlug.replace(/-(en|pl)$/i, '');
    const publishedAt = new Date().toISOString();
    const includeSourceAttribution = article.includeSourceAttribution !== false;
    const qualityGateEnabled = article.qualityGateEnabled !== false;
    const parsedThreshold = Number(article.minimumQualityScore ?? 65);
    const minimumQualityScore = Number.isFinite(parsedThreshold)
      ? Math.min(95, Math.max(40, Math.round(parsedThreshold)))
      : 65;

    const normalizedSourceUrls = normalizeSourceUrls(article.sourceUrls);
    const fallbackSource = typeof article.url === 'string' && isValidHttpUrl(article.url) ? [article.url] : [];
    const sourceUrls = Array.from(new Set([...normalizedSourceUrls, ...fallbackSource])).slice(0, 8);
    const normalizedSourceAttributions = normalizeSourceAttributions(article.sourceAttributions);
    
    console.log(`📤 Publishing article with base slug: ${baseSlug}`);
    
    // ✅ Финальная quality-проверка перед публикацией:
    // 1) детерминированная очистка парсер-артефактов
    // 2) AI review (если доступен API ключ)
    let contentEn = sanitizeArticleBodyText(normalizeAiGeneratedText(article.content || ''), {
      language: 'en',
      aggressive: true,
      preserveMonetizationMarker: false,
    });
    let contentPl = sanitizeArticleBodyText(
      normalizeAiGeneratedText(article.translations?.pl?.content || article.content || ''),
      {
        language: 'pl',
        aggressive: true,
        preserveMonetizationMarker: false,
      }
    );
    if (!contentEn) {
      contentEn = normalizeAiGeneratedText(article.content || '');
    }
    if (!contentPl) {
      contentPl = normalizeAiGeneratedText(article.translations?.pl?.content || article.content || '');
    }
    let enTitlePolicy = evaluateTitlePolicy(article.title || '', {
      fallback: article.title || 'Untitled Article',
      minLength: TITLE_MIN_LENGTH,
      maxLength: TITLE_MAX_LENGTH,
    });
    let plTitlePolicy = evaluateTitlePolicy(article.translations?.pl?.title || enTitlePolicy.title, {
      fallback: enTitlePolicy.title,
      minLength: TITLE_MIN_LENGTH,
      maxLength: TITLE_MAX_LENGTH,
    });
    let finalTitleEn = enTitlePolicy.title;
    let finalTitlePl = plTitlePolicy.title;
    let finalExcerptEn = sanitizeExcerptText(article.excerpt || finalTitleEn || contentEn, 200);
    let finalExcerptPl = sanitizeExcerptText(
      article.translations?.pl?.excerpt || article.translations?.pl?.title || finalExcerptEn || contentPl,
      200
    );
    let enQualityScore: number | null = null;
    let plQualityScore: number | null = null;
    let enQualityIssues: string[] = [...enTitlePolicy.issues];
    let plQualityIssues: string[] = article.translations?.pl ? [...plTitlePolicy.issues] : [];

    try {
      const reviewedEn = await editorialQualityService.reviewArticle({
        title: finalTitleEn,
        excerpt: finalExcerptEn,
        content: contentEn,
        language: 'en',
      });
      enTitlePolicy = evaluateTitlePolicy(reviewedEn.title || finalTitleEn, {
        fallback: finalTitleEn || article.title || 'Untitled Article',
        minLength: TITLE_MIN_LENGTH,
        maxLength: TITLE_MAX_LENGTH,
      });
      finalTitleEn = enTitlePolicy.title;
      finalExcerptEn = sanitizeExcerptText(reviewedEn.excerpt || finalExcerptEn || finalTitleEn, 200);
      enQualityScore = reviewedEn.qualityScore;
      enQualityIssues = uniqueIssueList([...(reviewedEn.issues || []), ...enTitlePolicy.issues]);
      contentEn =
        sanitizeArticleBodyText(reviewedEn.content || contentEn, {
          language: 'en',
          aggressive: true,
          preserveMonetizationMarker: false,
        }) ||
        contentEn;
      console.log(
        `[QualityGate] EN score=${reviewedEn.qualityScore}, ai=${reviewedEn.usedAI}, issues=${reviewedEn.issues.length}`
      );
    } catch (qualityError) {
      console.warn('[QualityGate] EN review failed, keeping deterministic cleanup only', qualityError);
    }

    if (article.translations?.pl) {
      try {
        const reviewedPl = await editorialQualityService.reviewArticle({
          title: finalTitlePl || article.translations.pl.title || finalTitleEn,
          excerpt: finalExcerptPl,
          content: contentPl,
          language: 'pl',
        });
        plTitlePolicy = evaluateTitlePolicy(reviewedPl.title || finalTitlePl || article.translations.pl.title, {
          fallback: finalTitlePl || finalTitleEn,
          minLength: TITLE_MIN_LENGTH,
          maxLength: TITLE_MAX_LENGTH,
        });
        finalTitlePl = plTitlePolicy.title;
        finalExcerptPl = sanitizeExcerptText(reviewedPl.excerpt || finalExcerptPl || finalTitlePl, 200);
        plQualityScore = reviewedPl.qualityScore;
        plQualityIssues = uniqueIssueList([...(reviewedPl.issues || []), ...plTitlePolicy.issues]);
        contentPl =
          sanitizeArticleBodyText(reviewedPl.content || contentPl, {
            language: 'pl',
            aggressive: true,
            preserveMonetizationMarker: false,
          }) ||
          contentPl;
        console.log(
          `[QualityGate] PL score=${reviewedPl.qualityScore}, ai=${reviewedPl.usedAI}, issues=${reviewedPl.issues.length}`
        );
      } catch (qualityError) {
        console.warn('[QualityGate] PL review failed, keeping deterministic cleanup only', qualityError);
      }
    }

    enTitlePolicy = evaluateTitlePolicy(finalTitleEn, {
      fallback: article.title || finalTitleEn || 'Untitled Article',
      minLength: TITLE_MIN_LENGTH,
      maxLength: TITLE_MAX_LENGTH,
    });
    enQualityIssues = uniqueIssueList([...enQualityIssues, ...enTitlePolicy.issues]);
    finalTitleEn = enTitlePolicy.title;

    if (article.translations?.pl) {
      plTitlePolicy = evaluateTitlePolicy(finalTitlePl || finalTitleEn, {
        fallback: finalTitleEn,
        minLength: TITLE_MIN_LENGTH,
        maxLength: TITLE_MAX_LENGTH,
      });
      plQualityIssues = uniqueIssueList([...plQualityIssues, ...plTitlePolicy.issues]);
      finalTitlePl = plTitlePolicy.title;
    }

    if (qualityGateEnabled) {
      const failedEn = typeof enQualityScore === 'number' && enQualityScore < minimumQualityScore;
      const failedPl =
        Boolean(article.translations?.pl) &&
        typeof plQualityScore === 'number' &&
        plQualityScore < minimumQualityScore;
      const failedEnTitle = enTitlePolicy.issues.length > 0;
      const failedPlTitle = Boolean(article.translations?.pl) && plTitlePolicy.issues.length > 0;

      if (failedEn || failedPl || failedEnTitle || failedPlTitle) {
        return NextResponse.json(
          {
            success: false,
            error: 'Quality gate rejected publication',
            reason: 'quality_gate_failed',
            qualityGate: {
              minimumQualityScore,
              titleLengthRange: {
                min: TITLE_MIN_LENGTH,
                max: TITLE_MAX_LENGTH,
              },
              scores: {
                en: enQualityScore,
                pl: plQualityScore,
              },
              titles: {
                en: {
                  value: finalTitleEn,
                  length: enTitlePolicy.length,
                  issues: enTitlePolicy.issues,
                },
                pl: article.translations?.pl
                  ? {
                      value: finalTitlePl,
                      length: plTitlePolicy.length,
                      issues: plTitlePolicy.issues,
                    }
                  : null,
              },
              issues: {
                en: enQualityIssues,
                pl: plQualityIssues,
              },
            },
          },
          { status: 422 }
        );
      }
    }

    // Persist reviewed title/excerpts for publication payloads
    article.title = finalTitleEn;
    article.excerpt = finalExcerptEn;
    if (article.translations?.pl) {
      article.translations.pl.title = finalTitlePl || article.translations.pl.title;
      article.translations.pl.excerpt = finalExcerptPl;
      article.translations.pl.content = contentPl;
    }

    // ✅ v8.4.0: Расстановка изображений в контенте

    // Normalize image order: prefer first non-placeholder image as hero
    const rawImages: string[] = [];
    if (article.image) rawImages.push(article.image);
    if (article.images && Array.isArray(article.images)) {
      rawImages.push(...article.images);
    }

    const uniqueImages = Array.from(new Set(rawImages.filter((img: string) => Boolean(img && img.trim()))));
    const persistentImages = uniqueImages.filter((img) => !isPlaceholderImage(img));
    const preferredHeroImage = persistentImages[0] || '';
    const allImages =
      preferredHeroImage
        ? [preferredHeroImage, ...persistentImages.filter((img) => img !== preferredHeroImage)]
        : [];
    let heroImage = preferredHeroImage;
    
    if (allImages.length > 0) {
      console.log(`🖼️ Placing ${allImages.length} images in content`);
      
      // Расставляем изображения в английском контенте
      const enResult = placeImagesInContent(contentEn, {
        imageUrls: allImages,
        title: article.title,
        format: 'markdown'
      });
      contentEn = enResult.contentWithImages;
      heroImage = enResult.heroImage || heroImage;
      
      console.log(`🖼️ EN: Hero + ${enResult.placements.length} images placed at ${enResult.placements.join('%, ')}%`);
      
      // Расставляем изображения в польском контенте
      if (article.translations?.pl?.content) {
        const plResult = placeImagesInContent(contentPl, {
          imageUrls: allImages,
          title: article.translations.pl.title || article.title,
          format: 'markdown'
        });
        contentPl = plResult.contentWithImages;
        console.log(`🖼️ PL: Hero + ${plResult.placements.length} images placed`);
      }
    }

    // ✅ v8.6.16: Персональные настройки монетизации для конкретной статьи.
    if (article.monetizationSettings) {
      contentEn = injectMonetizationSettingsIntoContent(contentEn, article.monetizationSettings);
      contentPl = injectMonetizationSettingsIntoContent(contentPl, article.monetizationSettings);
      console.log(
        `💰 Applied custom monetization settings: ${article.monetizationSettings.enabledAdPlacementIds?.length || 0} ad slots, ` +
          `${article.monetizationSettings.enabledVideoPlayerIds?.length || 0} video players`
      );
    }

    const inlineSourceAttributions = normalizeSourceAttributions([
      ...extractSourceAttributionsFromContent(article.content || ''),
      ...extractSourceAttributionsFromContent(article.translations?.pl?.content || ''),
      ...extractSourceAttributionsFromContent(contentEn),
      ...extractSourceAttributionsFromContent(contentPl),
    ]);
    let sourceAttributions = normalizeSourceAttributions([
      ...normalizedSourceAttributions,
      ...inlineSourceAttributions,
    ]);

    if (sourceAttributions.length === 0 && sourceUrls.length > 0) {
      sourceAttributions = await hydrateSourceAttributionsFromUrls(sourceUrls);
    }
    if (sourceAttributions.length === 0 && sourceUrls.length > 0) {
      sourceAttributions = sourceUrls.map((url) => ({
        label: sourceHostLabel(url),
        url,
      }));
    }

    if (includeSourceAttribution && sourceAttributions.length > 0) {
      contentEn = appendSourceAttribution(contentEn, sourceAttributions, 'en');
      contentPl = appendSourceAttribution(contentPl, sourceAttributions, 'pl');
    }
    
    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем в Supabase для персистентности!
    const enSlug = `${baseSlug}-en`;
    const plSlug = `${baseSlug}-pl`;
    const cleanExcerptEn = sanitizeExcerptText(article.excerpt || article.title || contentEn, 200);
    const cleanExcerptPl = sanitizeExcerptText(
      article.translations?.pl?.excerpt || article.translations?.pl?.title || cleanExcerptEn || contentPl,
      200
    );
    const persistentHeroImage = heroImage && !isPlaceholderImage(heroImage) ? heroImage : null;
    
    // Подготовка данных для Supabase
    const supabaseData = {
      chat_id: 0, // Admin panel
      title: article.title,
      slug_en: enSlug,
      slug_pl: plSlug,
      content_en: contentEn,
      content_pl: contentPl,
      excerpt_en: cleanExcerptEn,
      excerpt_pl: cleanExcerptPl,
      image_url: persistentHeroImage,
      category: article.category || 'tech',
      author: article.author || 'AI Editorial Team',
      tags: Array.isArray(article.tags) ? article.tags : ['ai-processed', 'imported'],
      word_count: Math.round((article.content?.split(/\s+/).length || 0)),
      languages: article.translations?.pl ? ['en', 'pl'] : ['en'],
      source: 'admin-panel',
      source_url: sourceUrls.length > 0 ? sourceUrls[0] : null,
      original_input: article.title,
      meta_description: cleanExcerptEn.substring(0, 160),
      published: true,
      featured: false,
      url_en: buildSiteUrl(`/en/article/${enSlug}`),
      url_pl: buildSiteUrl(`/pl/article/${plSlug}`)
    };
    
    // Сохраняем в Supabase
    const { data: savedArticle, error: saveError } = await supabase
      .from('published_articles')
      .insert([supabaseData])
      .select()
      .single();
    
    if (saveError) {
      console.error('❌ Supabase save error:', saveError);
      throw new Error(`Failed to save to database: ${saveError.message}`);
    }
    
    console.log(`✅ Saved to Supabase: ID ${savedArticle.id}`);
    
    // Также добавляем в runtime для немедленного отображения
    const enPost = {
      slug: enSlug,
      title: article.title,
      excerpt: cleanExcerptEn,
      publishedAt,
      image: persistentHeroImage || undefined,
      category: { name: article.category || 'Technology', slug: article.category || 'tech' },
      content: contentEn, // ✅ v8.4.0: Контент с изображениями
      author: article.author || 'AI Editorial Team',
      tags: ['ai-processed', 'imported']
    };
    
    addRuntimeArticle(enPost);
    console.log(`✅ Added EN to runtime: /en/article/${enPost.slug}`);
    
    // Польская версия
    if (article.translations && article.translations.pl) {
      const plPost = {
        slug: plSlug,
        title: article.translations.pl.title,
        excerpt: cleanExcerptPl,
        publishedAt,
        image: persistentHeroImage || undefined,
        category: { name: article.category || 'Technology', slug: article.category || 'tech' },
        content: contentPl, // ✅ v8.4.0: Контент с изображениями
        author: article.author || 'AI Editorial Team',
        tags: ['ai-processed', 'imported', 'translated']
      };
      
      addRuntimeArticle(plPost);
      console.log(`✅ Added PL to runtime: /pl/article/${plPost.slug}`);
    }

    // 2. WordPress integration decommissioned.
    const wordpressPublished = ENABLE_WORDPRESS_PUBLISH;
    console.log('⏭️ WordPress publishing skipped (decommissioned)');

    // 3. Возвращаем успешный результат (статья доступна локально)
    return NextResponse.json({
      success: true,
      message: `Article "${article.title}" successfully published`,
      locallyPublished: true,
      wordpressPublished,
      url: buildSiteUrl(`/en/article/${enSlug}`), // ✅ Ссылка с суффиксом -en
      urls: {
        en: buildSiteUrl(`/en/article/${enSlug}`), // ✅ slug-name-en
        pl: article.translations?.pl ? buildSiteUrl(`/pl/article/${plSlug}`) : null // ✅ slug-name-pl
      }
    });

  } catch (error) {
    console.error('❌ Publication error:', error);
    
    return NextResponse.json(
      { 
        error: 'Ошибка публикации статьи',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
