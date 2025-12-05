/**
 * Сервис для копирайтинга и улучшения контента через OpenAI
 * Специализированный для технологического контента icoffio
 */

interface CopywritingRequest {
  title: string;
  content: string;
  category?: string;
  tone?: 'professional' | 'casual' | 'technical' | 'news';
  targetAudience?: 'general' | 'tech-enthusiasts' | 'professionals' | 'gamers';
  language?: string;
  maxLength?: number;
  systemPrompt?: string; // ✅ v8.4.0: Кастомный системный промпт из Content Prompts
}

interface CopywritingResponse {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  metaDescription: string;
  readingTime: number;
  improvements: string[];
}

interface SEOKeywords {
  primary: string[];
  secondary: string[];
  longTail: string[];
}

class CopywritingService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Проверяет доступность сервиса копирайтинга
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Основная функция улучшения контента
   */
  async enhanceContent(request: CopywritingRequest): Promise<CopywritingResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key не настроен');
    }

    try {
      const enhancedContent = await this.callOpenAI(this.buildEnhancementPrompt(request));
      const seoKeywords = await this.generateSEOKeywords(request.title, request.category || 'tech');
      
      const parsedContent = this.parseAIResponse(enhancedContent);
      
      return {
        ...parsedContent,
        readingTime: this.calculateReadingTime(parsedContent.content),
        improvements: await this.analyzeImprovements(request.content, parsedContent.content)
      };

    } catch (error) {
      console.error('Content enhancement error:', error);
      throw new Error(`Ошибка улучшения контента: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Создание SEO-оптимизированного заголовка
   */
  async createSEOTitle(originalTitle: string, category: string): Promise<{
    primary: string;
    alternatives: string[];
    keywords: string[];
  }> {
    const prompt = `
Создай SEO-оптимизированный заголовок для статьи в категории "${category}".
Оригинальный заголовок: "${originalTitle}"

Требования:
- Длина 50-60 символов
- Включай ключевые слова
- Привлекательный и кликабельный
- Соответствует стилю технологического медиа

Верни JSON:
{
  "primary": "основной заголовок",
  "alternatives": ["альтернатива 1", "альтернатива 2", "альтернатива 3"],
  "keywords": ["ключевое слово 1", "ключевое слово 2"]
}`;

    const response = await this.callOpenAI(prompt);
    return this.parseAIResponse(response);
  }

  /**
   * Генерация мета-описания
   */
  async generateMetaDescription(title: string, content: string): Promise<string> {
    const prompt = `
Создай мета-описание для статьи длиной 150-160 символов.
Заголовок: ${title}
Содержание: ${content.substring(0, 500)}...

Мета-описание должно:
- Быть информативным и привлекательным
- Содержать ключевые слова
- Мотивировать к переходу на сайт
- Точно описывать содержание статьи
`;

    const response = await this.callOpenAI(prompt);
    return response.trim().replace(/"/g, '');
  }

  /**
   * Генерация тегов для статьи
   */
  async generateTags(title: string, content: string, category: string): Promise<string[]> {
    const prompt = `
Создай 5-8 релевантных тегов для статьи в категории "${category}".
Заголовок: ${title}
Содержание: ${content.substring(0, 1000)}...

Теги должны быть:
- Релевантными содержанию
- Популярными в поиске
- In English language
- Одно-два слова

Верни только массив тегов через запятую.
`;

    const response = await this.callOpenAI(prompt);
    return response.split(',').map(tag => tag.trim()).filter(tag => tag);
  }

  /**
   * Анализ тональности и стиля контента
   */
  async analyzeTone(content: string): Promise<{
    tone: string;
    formality: number; // 1-10
    technical: number; // 1-10
    engagement: number; // 1-10
    recommendations: string[];
  }> {
    const prompt = `
Проанализируй тональность и стиль следующего текста:
"${content.substring(0, 1000)}"

Верни JSON анализ:
{
  "tone": "описание тональности",
  "formality": число_от_1_до_10,
  "technical": число_от_1_до_10,
  "engagement": число_от_1_до_10,
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}
`;

    const response = await this.callOpenAI(prompt);
    return this.parseAIResponse(response);
  }

  /**
   * Оптимизация контента для разных платформ
   */
  async adaptForPlatform(content: string, platform: 'blog' | 'social' | 'email' | 'press'): Promise<string> {
    const platformSpecs = {
      blog: 'Блог статья: подробная, структурированная, SEO-оптимизированная',
      social: 'Социальные сети: краткая, с хештегами, призывами к действию',
      email: 'Email рассылка: персонализированная, с четкой структурой',
      press: 'Пресс-релиз: формальная, фактическая, новостная'
    };

    const prompt = `
Адаптируй следующий контент для платформы "${platform}":
${platformSpecs[platform]}

Оригинальный контент:
"${content}"

Адаптированная версия должна сохранить основную суть, но быть оптимизирована для целевой платформы.
`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Проверка на плагиат и уникальность
   */
  async checkUniqueness(content: string): Promise<{
    uniquenessScore: number;
    suspiciousFragments: string[];
    recommendations: string[];
  }> {
    // Здесь можно интегрировать API сервисы проверки плагиата
    // Пока возвращаем базовую проверку через AI
    const prompt = `
Оцени уникальность и оригинальность следующего контента.
Найди потенциально неоригинальные фрагменты:

"${content.substring(0, 2000)}"

Верни JSON:
{
  "uniquenessScore": число_от_0_до_100,
  "suspiciousFragments": ["подозрительный фрагмент 1"],
  "recommendations": ["рекомендация по улучшению"]
}
`;

    const response = await this.callOpenAI(prompt);
    return this.parseAIResponse(response);
  }

  // Приватные методы

  private buildEnhancementPrompt(request: CopywritingRequest): string {
    const { title, content, category, tone, targetAudience, language, systemPrompt } = request;

    // ✅ v8.4.0: Если есть кастомный systemPrompt из Content Prompts - используем его
    const styleInstructions = systemPrompt || `
Ты опытный копирайтер технологического медиа icoffio.com. 
Улучши эту статью, сделав её профессиональной и привлекательной для читателей.

СТИЛЬ ПИСЬМА icoffio:
- Информативный, но доступный
- Фокус на пользе для читателя  
- Современный технологический сленг
- Конкретные факты и данные
- Привлекательные заголовки`;

    return `
${styleInstructions}

ИСХОДНЫЕ ДАННЫЕ:
Заголовок: ${title}
Категория: ${category || 'технологии'}
Контент: ${content}
Тональность: ${tone || 'professional'}
Целевая аудитория: ${targetAudience || 'general'}
Язык: ${language || 'ru'}

ТРЕБОВАНИЯ К ВЫХОДНЫМ ДАННЫМ:
1. Улучши заголовок (SEO-оптимизированный, 50-60 символов)
2. Структурируй текст с подзаголовками и списками
3. Создай краткое описание (excerpt) до 200 символов
4. Определи категорию: ai, apple, games, tech
5. Добавь 5-8 релевантных тегов
6. Создай мета-описание (150-160 символов)

ВАЖНО: Пиши на том же языке, что и исходный контент!

Верни результат в формате JSON:
{
  "title": "улучшенный заголовок",
  "content": "улучшенное содержание с разметкой",
  "excerpt": "краткое описание",
  "category": "ai|apple|games|tech",
  "tags": ["тег1", "тег2", "тег3"],
  "metaDescription": "мета описание"
}
`;
  }

  private async generateSEOKeywords(title: string, category: string): Promise<SEOKeywords> {
    const prompt = `
Генерируй SEO ключевые слова для статьи:
Заголовок: ${title}
Категория: ${category}

Верни JSON:
{
  "primary": ["основное ключевое слово 1", "основное ключевое слово 2"],
  "secondary": ["дополнительное 1", "дополнительное 2"],
  "longTail": ["длинное ключевое словосочетание 1"]
}
`;

    const response = await this.callOpenAI(prompt);
    return this.parseAIResponse(response);
  }

  private async analyzeImprovements(originalContent: string, enhancedContent: string): Promise<string[]> {
    const prompt = `
Сравни оригинальный и улучшенный контент. Опиши основные улучшения:

ОРИГИНАЛ:
${originalContent.substring(0, 1000)}...

УЛУЧШЕННАЯ ВЕРСИЯ:
${enhancedContent.substring(0, 1000)}...

Верни массив улучшений в JSON формате:
["улучшение 1", "улучшение 2", "улучшение 3"]
`;

    const response = await this.callOpenAI(prompt);
    return this.parseAIResponse(response);
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200; // Средняя скорость чтения
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key не настроен');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter and SEO specialist for icoffio technology media. Always respond in English unless otherwise specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private parseAIResponse(response: string): any {
    try {
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Если JSON не найден, возвращаем как строку
      return response;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return { content: response };
    }
  }
}

// Экспортируем синглтон сервиса
export const copywritingService = new CopywritingService();




