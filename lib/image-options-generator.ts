/**
 * 🎨 IMAGE OPTIONS GENERATOR
 * 
 * Генерирует варианты изображений для статьи:
 * - 3x Unsplash (разные поисковые запросы)
 * - 2x AI Generated (разные промпты)
 */

import { ImageOption } from './stores/admin-store';

// ============================================================================
// SEARCH QUERY GENERATION
// ============================================================================

/**
 * Генерирует 3 разных поисковых запроса для Unsplash
 */
export function generateSearchQueries(title: string, category: string, excerpt?: string): string[] {
  const queries: string[] = [];
  
  // Query 1: Main concept from title
  const mainConcept = extractMainConcept(title);
  queries.push(mainConcept);
  
  // Query 2: Category + technology
  queries.push(`${category} technology`);
  
  // Query 3: Keywords from title + excerpt
  const keywords = extractKeywords(title, excerpt);
  queries.push(keywords.join(' '));
  
  return queries;
}

/**
 * Извлекает главную концепцию из заголовка
 */
function extractMainConcept(title: string): string {
  // Удаляем общие слова и берем ключевые
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
  const words = title.toLowerCase()
    .split(/\s+/)
    .filter(word => !commonWords.includes(word) && word.length > 3);
  
  // Берем первые 2-3 значимых слова
  return words.slice(0, 3).join(' ');
}

/**
 * Извлекает ключевые слова из текста
 */
function extractKeywords(title: string, excerpt?: string): string[] {
  const text = (title + ' ' + (excerpt || '')).toLowerCase();
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
  
  const words = text
    .split(/\s+/)
    .filter(word => !commonWords.includes(word) && word.length > 4)
    .slice(0, 5);
  
  return words;
}

// ============================================================================
// AI PROMPT GENERATION
// ============================================================================

/**
 * Генерирует 2 разных промпта для DALL-E/AI изображений
 */
export function generateImagePrompts(title: string, category: string, excerpt?: string): string[] {
  const prompts: string[] = [];
  
  // Prompt 1: Professional/Editorial style
  prompts.push(
    `Professional editorial image for article about "${extractMainConcept(title)}". ` +
    `Modern, clean, technology-focused. High quality photography style. ` +
    `Category: ${category}. Cinematic lighting, sharp focus, 8K.`
  );
  
  // Prompt 2: Abstract/Conceptual style  
  prompts.push(
    `Abstract conceptual illustration representing "${extractMainConcept(title)}". ` +
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
          body: JSON.stringify({ prompt })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          return {
            id: `ai-${index + 1}-${Date.now()}`,
            url: data.imageUrl,
            thumbnail: data.imageUrl, // DALL-E doesn't provide separate thumbnail
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
}): Promise<{
  unsplash: ImageOption[];
  aiGenerated: ImageOption[];
}> {
  console.log('🎨 Generating image options for article:', article.title);
  
  // 1. Генерируем поисковые запросы и промпты
  const searchQueries = generateSearchQueries(article.title, article.category, article.excerpt);
  const imagePrompts = generateImagePrompts(article.title, article.category, article.excerpt);
  
  console.log('📝 Search queries:', searchQueries);
  console.log('📝 AI prompts:', imagePrompts);
  
  // 2. Параллельно получаем Unsplash и генерируем AI изображения
  const [unsplashOptions, aiOptions] = await Promise.all([
    fetchUnsplashOptions(searchQueries),
    generateAIOptions(imagePrompts)
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
}): Promise<{
  unsplash: ImageOption[];
  aiGenerated: ImageOption[];
}> {
  console.log('🔄 Regenerating image options for article:', article.title);
  
  // Генерируем альтернативные запросы
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

