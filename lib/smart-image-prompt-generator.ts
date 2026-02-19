/**
 * SMART IMAGE PROMPT GENERATOR v7.8.0
 * 
 * Использует GPT-4 для анализа статьи и генерации релевантных промптов для изображений
 * Поддерживает DALL-E и Unsplash с автоматической оптимизацией тегов
 * 
 * @version 7.8.0
 * @date 2025-10-30
 */

import OpenAI from 'openai';

export interface ImagePromptRequest {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  language?: string;
}

export interface SmartImagePrompt {
  heroPrompt: string;           // Главное изображение (миниатюра)
  contentPrompts: string[];      // 2-3 промпта для изображений в статье
  unsplashTags: string[];        // Оптимизированные теги для Unsplash
  dallePrompts: string[];        // Детальные промпты для DALL-E
  keywords: string[];            // Ключевые слова статьи
  visualStyle: string;           // Рекомендуемый визуальный стиль
  colorPalette?: string;         // Рекомендуемая цветовая палитра
}

class SmartImagePromptGenerator {
  private openai: OpenAI | null = null;
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.initialized = true;
    } else {
      console.warn('[SmartImagePrompt] OpenAI API key not found. Smart prompts disabled.');
    }
  }

  /**
   * Генерирует умные промпты для изображений статьи
   */
  async generatePrompts(request: ImagePromptRequest): Promise<SmartImagePrompt> {
    if (!this.initialized || !this.openai) {
      // Fallback к базовым промптам если OpenAI недоступен
      return this.generateFallbackPrompts(request);
    }

    try {
      console.log('[SmartImagePrompt] Analyzing article for image prompts...');

      const systemPrompt = `You are an expert visual content curator and image search specialist.
Your task is to analyze article content and generate highly relevant, specific image search queries.

Follow these guidelines:
1. Extract the main visual concepts and themes from the article
2. Generate diverse, specific search queries (not generic terms like "technology" or "business")
3. For Unsplash: use 2-4 word phrases that are concrete and searchable
4. For DALL-E: create detailed, descriptive prompts with style, mood, and composition
5. Ensure each prompt is unique and captures different aspects of the article
6. Consider the article's tone, subject matter, and target audience

Focus on creating prompts that will find/generate images that:
- Directly relate to the article's main topics
- Are visually engaging and professional
- Avoid clichés and overused stock photo concepts
- Match the article's sophistication level`;

      const userPrompt = `Analyze this article and generate smart image prompts:

Title: "${request.title}"
Category: ${request.category}
Excerpt: "${request.excerpt}"

Content preview (first 500 chars):
"${request.content.substring(0, 500)}"

Generate a JSON response with:
1. heroPrompt: One compelling prompt for the main article image (hero/thumbnail)
2. contentPrompts: 2-3 diverse prompts for images within the article content
3. unsplashTags: 8-12 specific, searchable tags for Unsplash (2-3 words each)
4. dallePrompts: 2 detailed DALL-E prompts with style and composition details
5. keywords: 5-7 main keywords from the article
6. visualStyle: Recommended visual style (e.g., "modern minimalist", "photorealistic", "infographic style")
7. colorPalette: Suggested color mood (e.g., "cool blues and whites", "warm earth tones")

Make sure prompts are:
- Specific to THIS article (not generic)
- Visually descriptive
- Searchable on Unsplash
- Diverse from each other

Return valid JSON only.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini', // Быстрая и дешевая модель для промптов
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      const parsedResponse = JSON.parse(responseContent);

      console.log('[SmartImagePrompt] ✅ Generated smart prompts:', {
        heroPrompt: parsedResponse.heroPrompt?.substring(0, 50),
        promptsCount: parsedResponse.contentPrompts?.length || 0,
        tagsCount: parsedResponse.unsplashTags?.length || 0
      });

      // Validate and normalize response
      return {
        heroPrompt: parsedResponse.heroPrompt || request.title,
        contentPrompts: Array.isArray(parsedResponse.contentPrompts) 
          ? parsedResponse.contentPrompts.slice(0, 3)
          : [request.title],
        unsplashTags: Array.isArray(parsedResponse.unsplashTags)
          ? parsedResponse.unsplashTags.slice(0, 12)
          : this.extractKeywordsFromTitle(request.title),
        dallePrompts: Array.isArray(parsedResponse.dallePrompts)
          ? parsedResponse.dallePrompts.slice(0, 2)
          : [parsedResponse.heroPrompt || request.title],
        keywords: Array.isArray(parsedResponse.keywords)
          ? parsedResponse.keywords.slice(0, 7)
          : this.extractKeywordsFromTitle(request.title),
        visualStyle: parsedResponse.visualStyle || 'modern professional',
        colorPalette: parsedResponse.colorPalette || 'vibrant and engaging'
      };

    } catch (error: any) {
      console.error('[SmartImagePrompt] Error generating prompts:', error.message);
      
      // Fallback при ошибке
      return this.generateFallbackPrompts(request);
    }
  }

  /**
   * Генерирует оптимизированный Unsplash запрос из тегов
   */
  buildUnsplashQuery(tags: string[]): string {
    // Берем 3-4 самых релевантных тега
    const topTags = tags.slice(0, 4);
    return topTags.join(' ');
  }

  /**
   * Обновляет/уточняет промпт на основе пользовательского ввода
   */
  async refinePrompt(originalPrompt: string, userFeedback: string): Promise<string> {
    if (!this.initialized || !this.openai) {
      return `${originalPrompt} ${userFeedback}`;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an image search expert. Refine the search query based on user feedback.'
          },
          {
            role: 'user',
            content: `Original search query: "${originalPrompt}"
User wants: "${userFeedback}"

Generate an improved, specific search query that incorporates the user's feedback.
Return only the refined query, nothing else.`
          }
        ],
        temperature: 0.5,
        max_tokens: 100
      });

      return completion.choices[0]?.message?.content?.trim() || originalPrompt;

    } catch (error) {
      console.error('[SmartImagePrompt] Error refining prompt:', error);
      return `${originalPrompt} ${userFeedback}`;
    }
  }

  /**
   * Fallback генерация промптов без OpenAI
   */
  private generateFallbackPrompts(request: ImagePromptRequest): SmartImagePrompt {
    const keywords = this.extractKeywordsFromTitle(request.title);
    const categoryKeywords = this.getCategoryKeywords(request.category);

    return {
      heroPrompt: `${request.title} ${request.category}`,
      contentPrompts: [
        `${keywords[0]} ${categoryKeywords[0]}`,
        `${request.category} ${keywords[1] || 'concept'}`,
        `${keywords[2] || categoryKeywords[1]} technology`
      ],
      unsplashTags: [...keywords, ...categoryKeywords].slice(0, 10),
      dallePrompts: [
        `A professional illustration of ${request.title.toLowerCase()}, modern style, high quality`,
        `${request.category} themed image representing ${keywords.slice(0, 3).join(', ')}, photorealistic`
      ],
      keywords,
      visualStyle: 'modern professional',
      colorPalette: 'vibrant technology colors'
    };
  }

  /**
   * Извлекает ключевые слова из заголовка
   */
  private extractKeywordsFromTitle(title: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from'];
    
    return title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 7);
  }

  /**
   * Получает ключевые слова для категории
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      ai: ['artificial intelligence', 'machine learning', 'neural network', 'deep learning', 'AI technology'],
      apple: ['apple device', 'iOS', 'MacBook', 'iPhone', 'apple ecosystem'],
      tech: ['technology', 'innovation', 'digital', 'software', 'hardware'],
      games: ['gaming', 'video game', 'esports', 'console', 'game design'],
      cybersecurity: ['security', 'cyber defense', 'hacking', 'encryption', 'network security'],
      software: ['software development', 'programming', 'coding', 'application', 'development'],
      hardware: ['computer hardware', 'electronics', 'components', 'devices', 'equipment'],
      mobile: ['smartphone', 'mobile device', 'mobile app', 'wireless', 'portable'],
      cloud: ['cloud computing', 'cloud storage', 'cloud service', 'datacenter', 'server'],
      business: ['business', 'corporate', 'professional', 'enterprise', 'commerce']
    };

    return categoryMap[category.toLowerCase()] || categoryMap.tech;
  }
}

// Singleton instance
let smartPromptGenerator: SmartImagePromptGenerator | null = null;

export function getSmartImagePromptGenerator(): SmartImagePromptGenerator {
  if (!smartPromptGenerator) {
    smartPromptGenerator = new SmartImagePromptGenerator();
  }
  return smartPromptGenerator;
}

/**
 * Быстрая функция для генерации промптов
 */
export async function generateSmartImagePrompts(
  article: ImagePromptRequest
): Promise<SmartImagePrompt> {
  const generator = getSmartImagePromptGenerator();
  return generator.generatePrompts(article);
}

/**
 * Утилита для построения Unsplash query из тегов
 */
export function buildUnsplashQueryFromTags(tags: string[]): string {
  return getSmartImagePromptGenerator().buildUnsplashQuery(tags);
}

