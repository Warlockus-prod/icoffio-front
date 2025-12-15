import OpenAI from 'openai';

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

/**
 * Генерирует оптимизированный prompt для DALL-E 3
 */
function generateImagePrompt(params: ImageGenerationParams): string {
  const { title, excerpt, category } = params;
  
  // Базовый prompt с контекстом статьи
  let prompt = `Professional high-quality photograph for a tech journalism article titled "${title}".`;
  
  // Добавляем контекст из excerpt
  if (excerpt && excerpt.length > 20) {
    const excerptShort = excerpt.substring(0, 150);
    prompt += ` Context: ${excerptShort}`;
  }
  
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
      // Fallback к search-based URL если нет API ключа (3:2 aspect ratio)
      const encodedQuery = encodeURIComponent(query);
      const url = `https://images.unsplash.com/photo-1?q=${encodedQuery}&w=1200&h=800&fit=crop`;
      
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
    const url = `${data.urls.raw}&w=1200&h=800&fit=crop`; // 3:2 aspect ratio для inimage
    
    return {
      success: true,
      url,
      cost: 0,
    };
    
  } catch (error) {
    console.error('Unsplash API error:', error);
    
    // Fallback к прямому URL
    const encodedQuery = encodeURIComponent(query);
    const url = `https://images.unsplash.com/photo-1?q=${encodedQuery}&w=1200&h=400&fit=crop`;
    
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
          query = smartPrompts.heroPrompt;
          console.log('[ImageService] Generated smart prompt:', query);
        } catch (error) {
          console.warn('[ImageService] Smart prompts failed, using fallback');
          query = `${params.title} ${params.category || 'technology'}`;
        }
      } else {
        // Fallback к базовому query
        query = `${params.title} ${params.category || 'technology'}`;
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

