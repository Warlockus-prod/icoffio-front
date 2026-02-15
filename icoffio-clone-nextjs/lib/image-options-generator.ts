/**
 * 🎨 IMAGE OPTIONS GENERATOR
 * 
 * Генерирует варианты изображений для статьи:
 * - Unsplash (поисковые запросы по ключевым словам title)
 * - AI Generated (промпты по ключевым словам title)
 */

import { ImageOption } from './stores/admin-store';
import { buildTitleKeywordPhrase, extractTitleKeywords } from './image-keywords';

// ============================================================================
// SEARCH QUERY GENERATION
// ============================================================================

/**
 * Генерирует поисковые запросы для Unsplash на основе ключевых слов title
 */
export function generateSearchQueries(title: string, category: string, excerpt?: string): string[] {
  const queries: string[] = [];
  const keywords = extractTitleKeywords(title, 6);
  const fallback = buildTitleKeywordPhrase(title, 3);
  
  // Query 1: main keyword phrase
  queries.push(fallback);
  
  // Query 2: secondary keyword cluster
  const secondary = keywords.slice(1, 4).join(' ');
  if (secondary) {
    queries.push(secondary);
  }
  
  // Query 3: add third variation if possible
  const tertiary = keywords.slice(0, 2).join(' ');
  if (tertiary) {
    queries.push(`${tertiary} concept`);
  }

  // Keep uniqueness and non-empty values
  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
}

function extractMainConcept(title: string): string {
  return buildTitleKeywordPhrase(title, 3);
}

/**
 * Извлекает ключевые слова только из title (excerpt не используется специально)
 */
function extractKeywords(title: string, excerpt?: string): string[] {
  return extractTitleKeywords(title, 5);
}

// ============================================================================
// AI PROMPT GENERATION
// ============================================================================

/**
 * Генерирует 2 разных промпта для DALL-E/AI изображений
 */
export function generateImagePrompts(title: string, category: string, excerpt?: string): string[] {
  const prompts: string[] = [];
  const mainConcept = extractMainConcept(title);
  const keywordSet = extractTitleKeywords(title, 5).join(', ');
  
  // Prompt 1: Professional/Editorial style
  prompts.push(
    `Professional editorial image based on title keywords: ${keywordSet || mainConcept}. ` +
    `Modern, clean, technology-focused. High quality photography style. ` +
    `Category: ${category}. Cinematic lighting, sharp focus, 8K.`
  );
  
  // Prompt 2: Abstract/Conceptual style  
  prompts.push(
    `Abstract conceptual illustration representing: ${mainConcept}. ` +
    `Minimalist design, bold colors, geometric shapes. Digital art style. ` +
    `Professional, modern, tech-inspired. Clean composition.`
  );
  
  return prompts;
}

// ============================================================================
// UNSPLASH API
// ============================================================================

/**
 * Получает 3 изображения из Unsplash по разным запросам
 */
export async function fetchUnsplashOptions(
  queries: string[]
): Promise<ImageOption[]> {
  const options: ImageOption[] = [];
  
  try {
    // Получаем по 1 изображению на каждый запрос
    for (let i = 0; i < Math.min(queries.length, 3); i++) {
      const query = queries[i];
      
      try {
        const response = await fetch(
          `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
          {
            headers: {
              'Authorization': `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          options.push({
            id: `unsplash-${i + 1}-${data.id}`,
            url: data.urls.regular,
            thumbnail: data.urls.small,
            source: 'unsplash',
            searchQuery: query,
            author: data.user.name,
            authorUrl: data.user.links.html,
            width: data.width,
            height: data.height,
            description: data.description || data.alt_description || query
          });
        }
      } catch (error) {
        console.error(`Failed to fetch Unsplash image for query "${query}":`, error);
      }
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (error) {
    console.error('Error fetching Unsplash options:', error);
  }
  
  return options;
}

// ============================================================================
// AI IMAGE GENERATION
// ============================================================================

/**
 * Генерирует 2 AI изображения с разными промптами
 */
export async function generateAIOptions(
  prompts: string[]
): Promise<ImageOption[]> {
  const options: ImageOption[] = [];
  
  try {
    // Генерируем 2 изображения параллельно
    const generatePromises = prompts.slice(0, 2).map(async (prompt, index) => {
      try {
        const response = await fetch('/api/admin/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'dalle',
            title: prompt,
            excerpt: prompt,
            category: 'technology'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.url || data.imageUrl;
          if (!imageUrl) {
            return null;
          }
          
          return {
            id: `ai-${index + 1}-${Date.now()}`,
            url: imageUrl,
            thumbnail: imageUrl, // DALL-E doesn't provide separate thumbnail
            source: 'ai' as const,
            prompt: prompt,
            model: 'dall-e-3',
            width: 1024,
            height: 1024,
            description: `AI Generated: ${prompt.substring(0, 100)}...`
          };
        }
      } catch (error) {
        console.error(`Failed to generate AI image with prompt "${prompt.substring(0, 50)}...":`, error);
        return null;
      }
    });
    
    const results = await Promise.all(generatePromises);
    const validResults = results.filter(opt => opt !== null && opt !== undefined) as ImageOption[];
    options.push(...validResults);
  } catch (error) {
    console.error('Error generating AI options:', error);
  }
  
  return options;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Генерирует все варианты изображений для статьи
 */
export async function generateImageOptions(article: {
  title: string;
  category: string;
  excerpt?: string;
}, config?: {
  unsplashCount?: number;
  aiCount?: number;
  customQueries?: string[];
  customPrompts?: string[];
}): Promise<{
  unsplash: ImageOption[];
  aiGenerated: ImageOption[];
}> {
  console.log('🎨 Generating image options for article:', article.title);
  
  // 1. Определяем количество изображений
  const unsplashCount = config?.unsplashCount ?? 3;
  const aiCount = config?.aiCount ?? 2;
  
  // 2. Генерируем или используем кастомные запросы/промпты
  const searchQueries = config?.customQueries && config.customQueries.length > 0
    ? config.customQueries.slice(0, unsplashCount)
    : generateSearchQueries(article.title, article.category, article.excerpt).slice(0, unsplashCount);
    
  const imagePrompts = config?.customPrompts && config.customPrompts.length > 0
    ? config.customPrompts.slice(0, aiCount)
    : generateImagePrompts(article.title, article.category, article.excerpt).slice(0, aiCount);
  
  console.log(`📝 Generating ${unsplashCount} Unsplash + ${aiCount} AI images`);
  console.log('📝 Search queries:', searchQueries);
  console.log('📝 AI prompts:', imagePrompts);
  
  // 3. Параллельно получаем Unsplash и генерируем AI изображения
  const [unsplashOptions, aiOptions] = await Promise.all([
    unsplashCount > 0 ? fetchUnsplashOptions(searchQueries) : Promise.resolve([]),
    aiCount > 0 ? generateAIOptions(imagePrompts) : Promise.resolve([])
  ]);
  
  console.log(`✅ Generated ${unsplashOptions.length} Unsplash + ${aiOptions.length} AI options`);
  
  return {
    unsplash: unsplashOptions,
    aiGenerated: aiOptions
  };
}

/**
 * Регенерирует варианты изображений (новые запросы)
 */
export async function regenerateImageOptions(article: {
  title: string;
  category: string;
  excerpt?: string;
}, config?: {
  unsplashCount?: number;
  aiCount?: number;
  customQueries?: string[];
  customPrompts?: string[];
}): Promise<{
  unsplash: ImageOption[];
  aiGenerated: ImageOption[];
}> {
  console.log('🔄 Regenerating image options for article:', article.title);
  
  // Если есть кастомная конфигурация - используем её
  if (config) {
    return generateImageOptions(article, config);
  }
  
  // Иначе генерируем альтернативные запросы
  const alternativeQueries = [
    `${article.category} innovation`,
    extractKeywords(article.title, article.excerpt).slice(0, 3).join(' '),
    `modern ${article.category}`
  ];
  
  const alternativePrompts = [
    `Futuristic ${article.category} scene, digital art, vibrant colors, 4K quality`,
    `Minimalist ${article.category} concept, clean design, professional, modern`
  ];
  
  const [unsplashOptions, aiOptions] = await Promise.all([
    fetchUnsplashOptions(alternativeQueries),
    generateAIOptions(alternativePrompts)
  ]);
  
  console.log(`✅ Regenerated ${unsplashOptions.length} Unsplash + ${aiOptions.length} AI options`);
  
  return {
    unsplash: unsplashOptions,
    aiGenerated: aiOptions
  };
}
