import OpenAI from 'openai';
import { buildImageKeywordPhrase, extractImageKeywords } from './image-keywords';

// Ленивая инициализация OpenAI клиента (только когда нужен)
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

/**
 * Типы источников изображений
 */
export type ImageSource = 'dalle' | 'unsplash' | 'custom';

/**
 * Параметры для генерации изображения
 */
export interface ImageGenerationParams {
  title: string;
  excerpt?: string;
  category?: string;
  style?: 'natural' | 'vivid';
  quality?: 'standard' | 'hd';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

/**
 * Результат генерации изображения
 */
export interface ImageGenerationResult {
  success: boolean;
  url?: string;
  error?: string;
  cost?: number;
  revisedPrompt?: string;
}

const FALLBACK_UNSPLASH_IMAGES = {
  wearables: [
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
    'https://images.unsplash.com/photo-1576243345690-4e4b79b63288',
    'https://images.unsplash.com/photo-1544117519-31a4b719223d'
  ],
  apple: [
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3',
    'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37',
    'https://images.unsplash.com/photo-1603898037225-1c97b27ebc8f'
  ],
  ai: [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e'
  ],
  games: [
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f'
  ],
  tech: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085'
  ]
} as const;

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index++) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getFallbackPoolForQuery(query: string): readonly string[] {
  const normalized = query.toLowerCase();

  if (/(garmin|fenix|watch|smartwatch|wearable|fitness|runner|running|gps)/.test(normalized)) {
    return FALLBACK_UNSPLASH_IMAGES.wearables;
  }
  if (/(iphone|ipad|mac|apple|ios|airpods|watchos)/.test(normalized)) {
    return FALLBACK_UNSPLASH_IMAGES.apple;
  }
  if (/(ai|artificial|machine|neural|llm|robot|automation|gpt)/.test(normalized)) {
    return FALLBACK_UNSPLASH_IMAGES.ai;
  }
  if (/(game|gaming|xbox|playstation|nintendo|steam|esport)/.test(normalized)) {
    return FALLBACK_UNSPLASH_IMAGES.games;
  }

  return FALLBACK_UNSPLASH_IMAGES.tech;
}

function getKeywordAwareFallbackUnsplashUrl(query: string): string {
  const pool = getFallbackPoolForQuery(query);
  const selected = pool[hashString(query || 'technology') % pool.length];
  return `${selected}?w=1200&h=800&fit=crop&auto=format&q=80`;
}

/**
 * Генерирует оптимизированный prompt для DALL-E 3
 */
function generateImagePrompt(params: ImageGenerationParams): string {
  const { title, excerpt, category } = params;
  const keywordPhrase = buildImageKeywordPhrase({ title, excerpt, category }, 6);
  const keywordList = extractImageKeywords({ title, excerpt, category }, 6);
  const keywordText = keywordList.length > 0 ? keywordList.join(', ') : keywordPhrase;
  
  // Генерируем prompt строго из ключевых слов title (без полного заголовка/excerpt)
  let prompt =
    `Professional high-quality photograph based on keywords: ${keywordText}. ` +
    `Main concept: ${keywordPhrase}.`;
  
  // Добавляем стиль в зависимости от категории
  if (category) {
    const categoryStyles: Record<string, string> = {
      'ai': 'futuristic AI concept, neural networks, digital technology',
      'apple': 'modern Apple product design, minimalist, sleek',
      'tech': 'cutting-edge technology, innovation, modern',
      'games': 'gaming environment, immersive, dynamic',
      'digital': 'digital transformation, connectivity, modern business',
      'news': 'breaking news, journalism, professional',
    };
    
    const style = categoryStyles[category.toLowerCase()] || 'modern technology';
    prompt += ` Style: ${style}, clean composition, professional lighting.`;
  } else {
    prompt += ' Style: modern tech journalism, 4K quality, photorealistic, professional.';
  }
  
  // Добавляем технические требования для горизонтального формата (3:2 для inimage рекламы)
  prompt += ' No text, no watermarks, no logos. Horizontal landscape format (3:2 aspect ratio) suitable for article content with ad placement.';
  
  return prompt;
}

/**
 * Генерирует изображение через DALL-E 3 API
 */
export async function generateArticleImage(
  params: ImageGenerationParams
): Promise<ImageGenerationResult> {
  try {
    // Проверка наличия API ключа
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
      };
    }
    
    // Генерируем оптимизированный prompt
    const prompt = generateImagePrompt(params);
    
    console.log('🎨 Generating image with DALL-E 3...');
    console.log('📝 Prompt:', prompt);
    
    // Получаем OpenAI клиент
    const openai = getOpenAIClient();
    
    // Вызываем DALL-E 3 API
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: params.size || '1792x1024', // Landscape format (близко к 3:2) для inimage рекламы
      quality: params.quality || 'hd',
      style: params.style || 'natural',
    });
    
    if (!response.data || response.data.length === 0) {
      return {
        success: false,
        error: 'No response data from DALL-E 3',
      };
    }
    
    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt;
    
    if (!imageUrl) {
      return {
        success: false,
        error: 'No image URL returned from DALL-E 3',
      };
    }
    
    // Рассчитываем стоимость
    const cost = params.quality === 'hd' ? 0.08 : 0.04; // DALL-E 3 pricing
    
    console.log('✅ Image generated successfully!');
    console.log('🔗 URL:', imageUrl);
    console.log('💰 Cost: $' + cost.toFixed(2));
    
    return {
      success: true,
      url: imageUrl,
      cost,
      revisedPrompt,
    };
    
  } catch (error) {
    console.error('❌ DALL-E 3 generation error:', error);
    
    let errorMessage = 'Failed to generate image';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Генерирует несколько изображений для статьи
 * (для использования в контенте - дополнительные иллюстрации)
 */
export async function generateMultipleImages(
  params: ImageGenerationParams,
  count: number = 3
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];
  
  for (let i = 0; i < count; i++) {
    // Добавляем вариативность в prompts
    const modifiedParams = {
      ...params,
      title: `${params.title} - Illustration ${i + 1}`,
    };
    
    const result = await generateArticleImage(modifiedParams);
    results.push(result);
    
    // Небольшая задержка между запросами
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Получает изображение из Unsplash (альтернатива)
 */
export async function getUnsplashImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
): Promise<ImageGenerationResult> {
  try {
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!unsplashAccessKey) {
      const url = getKeywordAwareFallbackUnsplashUrl(query);
      console.warn('[ImageService] UNSPLASH_ACCESS_KEY is missing, using curated fallback image');
      
      return {
        success: true,
        url,
        cost: 0,
      };
    }
    
    // Используем Unsplash API
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}`,
      {
        headers: {
          Authorization: `Client-ID ${unsplashAccessKey}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const rawUrl = data?.urls?.raw;
    if (!rawUrl) {
      throw new Error('Unsplash API returned empty image URL');
    }
    const url = `${rawUrl}&w=1200&h=800&fit=crop`; // 3:2 aspect ratio для inimage
    
    return {
      success: true,
      url,
      cost: 0,
    };
    
  } catch (error) {
    console.error('Unsplash API error:', error);
    
    const url = getKeywordAwareFallbackUnsplashUrl(query);
    
    return {
      success: true,
      url,
      cost: 0,
    };
  }
}

/**
 * Универсальная функция для получения изображения из любого источника
 * v7.8.0: Добавлена поддержка умных промптов через AI
 */
export async function getArticleImage(
  source: ImageSource,
  params: ImageGenerationParams & { 
    unsplashTags?: string[]; 
    useSmartPrompts?: boolean;
    customQuery?: string;
  },
  customUrl?: string
): Promise<ImageGenerationResult> {
  switch (source) {
    case 'dalle':
      return generateArticleImage(params);
      
    case 'unsplash':
      let query: string;
      const keywordQuery = buildImageKeywordPhrase(
        {
          title: params.title,
          excerpt: params.excerpt,
          category: params.category,
        },
        5
      );
      
      if (params.customQuery) {
        // Используем кастомный query если указан
        query = params.customQuery;
      } else if (params.unsplashTags && params.unsplashTags.length > 0) {
        // Используем теги если указаны
        query = params.unsplashTags.slice(0, 4).join(' ');
      } else if (params.useSmartPrompts) {
        // Генерируем умные промпты через AI
        try {
          const { generateSmartImagePrompts } = await import('./smart-image-prompt-generator');
          const smartPrompts = await generateSmartImagePrompts({
            title: params.title,
            content: params.excerpt || '',
            excerpt: params.excerpt || params.title,
            category: params.category || 'technology'
          });
          // Даже в smart mode держим основу на ключевых словах title.
          query = keywordQuery || smartPrompts.unsplashTags.slice(0, 4).join(' ');
          console.log('[ImageService] Using keyword-first Unsplash query:', query);
        } catch (error) {
          console.warn('[ImageService] Smart prompts failed, using title keywords');
          query = keywordQuery || (params.category || 'technology');
        }
      } else {
        // Fallback к keyword query из title
        query = keywordQuery || (params.category || 'technology');
      }
      
      return getUnsplashImage(query);
      
    case 'custom':
      if (!customUrl) {
        return {
          success: false,
          error: 'Custom URL is required when using custom image source',
        };
      }
      return {
        success: true,
        url: customUrl,
        cost: 0,
      };
      
    default:
      return {
        success: false,
        error: `Unknown image source: ${source}`,
      };
  }
}
