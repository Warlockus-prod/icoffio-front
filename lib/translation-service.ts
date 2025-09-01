import { getTranslation } from './i18n';

interface TranslationRequest {
  content: string;
  targetLanguage: string;
  contentType?: 'title' | 'excerpt' | 'body';
}

interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence?: number;
}

class TranslationService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('🔑 OpenAI API key не найден. Установите переменную окружения OPENAI_API_KEY');
    }
  }

  // Проверка доступности сервиса
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  // Определение языка контента
  private getLanguageName(locale: string): string {
    const languages = {
      'en': 'English',
      'pl': 'Polish',
      'de': 'German', 
      'ro': 'Romanian',
      'cs': 'Czech',
      'ru': 'Russian',
      'es': 'Spanish',
      'fr': 'French'
    };
    
    return languages[locale as keyof typeof languages] || 'English';
  }

  // Создание промпта для перевода
  private createTranslationPrompt(content: string, targetLanguage: string, contentType: string): string {
    const languageName = this.getLanguageName(targetLanguage);
    
    const typeInstructions = {
      title: 'This is an article title. Keep it engaging and SEO-friendly.',
      excerpt: 'This is an article excerpt/description. Keep it informative and compelling.',
      body: 'This is article content. Maintain the original structure, formatting, and technical accuracy.'
    };

    const instruction = typeInstructions[contentType as keyof typeof typeInstructions] || typeInstructions.body;

    return `You are a professional translator specializing in technology and digital content. 

Task: Translate the following text to ${languageName}.

Requirements:
- Maintain the original meaning and tone
- Use appropriate technical terminology for ${languageName}
- Keep the same formatting and structure
- ${instruction}
- Make it sound natural for native ${languageName} speakers

Text to translate:
"""
${content}
"""

Please provide ONLY the translation, without any additional comments or explanations.`;
  }

  // Основной метод перевода
  async translateText({ content, targetLanguage, contentType = 'body' }: TranslationRequest): Promise<TranslationResponse> {
    if (!this.isAvailable()) {
      throw new Error('Translation service недоступен: отсутствует API ключ');
    }

    if (!content.trim()) {
      return {
        translatedText: '',
        sourceLanguage: 'unknown',
        targetLanguage,
        confidence: 0
      };
    }

    try {
      const prompt = this.createTranslationPrompt(content, targetLanguage, contentType);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Быстрая и эффективная модель для переводов
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Низкая температура для стабильных переводов
          max_tokens: Math.min(4000, content.length * 2), // Адаптивный лимит токенов
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API ошибка: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim() || '';

      if (!translatedText) {
        throw new Error('Пустой ответ от API перевода');
      }

      return {
        translatedText,
        sourceLanguage: 'auto-detected',
        targetLanguage,
        confidence: 0.9 // Высокое доверие к GPT-4
      };

    } catch (error) {
      console.error('Ошибка перевода:', error);
      
      // Fallback: возвращаем оригинальный текст с пометкой
      return {
        translatedText: content,
        sourceLanguage: 'unknown',
        targetLanguage,
        confidence: 0
      };
    }
  }

  // Массовый перевод контента
  async translateContent(
    content: { title: string; excerpt: string; body: string }, 
    targetLanguage: string
  ): Promise<{ title: string; excerpt: string; body: string }> {
    
    console.log(`🔄 Переводим контент на ${this.getLanguageName(targetLanguage)}...`);
    
    try {
      // Переводим параллельно для скорости
      const [titleResult, excerptResult, bodyResult] = await Promise.all([
        this.translateText({ content: content.title, targetLanguage, contentType: 'title' }),
        this.translateText({ content: content.excerpt, targetLanguage, contentType: 'excerpt' }),
        this.translateText({ content: content.body, targetLanguage, contentType: 'body' })
      ]);

      console.log(`✅ Перевод на ${this.getLanguageName(targetLanguage)} завершен`);

      return {
        title: titleResult.translatedText,
        excerpt: excerptResult.translatedText,
        body: bodyResult.translatedText
      };

    } catch (error) {
      console.error(`❌ Ошибка перевода на ${targetLanguage}:`, error);
      
      // Возвращаем оригинальный контент в случае ошибки
      return content;
    }
  }

  // Перевод на все поддерживаемые языки
  async translateToAllLanguages(
    content: { title: string; excerpt: string; body: string },
    excludeLanguages: string[] = []
  ): Promise<Record<string, { title: string; excerpt: string; body: string }>> {
    
    const supportedLanguages = ['en', 'pl', 'de', 'ro', 'cs'];
    const targetLanguages = supportedLanguages.filter(lang => !excludeLanguages.includes(lang));
    
    console.log(`🌐 Начинаем перевод на языки: ${targetLanguages.map(lang => this.getLanguageName(lang)).join(', ')}`);
    
    const translations: Record<string, { title: string; excerpt: string; body: string }> = {};

    // Переводим последовательно, чтобы не превысить rate limits
    for (const language of targetLanguages) {
      try {
        translations[language] = await this.translateContent(content, language);
        
        // Небольшая задержка между запросами для соблюдения rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Ошибка перевода на ${language}:`, error);
        translations[language] = content; // Fallback к оригинальному контенту
      }
    }

    return translations;
  }

  // Определение языка текста (простая эвристика)
  detectLanguage(text: string): string {
    const sample = text.toLowerCase().slice(0, 200);
    
    // Простые паттерны для определения языка
    const patterns = {
      en: /\b(the|and|or|is|are|was|were|have|has|will|would|could|should)\b/g,
      pl: /\b(że|jest|są|będzie|może|bardzo|tylko|przez|które|która)\b/g,
      de: /\b(der|die|das|und|oder|ist|sind|war|waren|haben|wird)\b/g,
      ro: /\b(și|este|sunt|pentru|care|sau|mai|foarte|doar|prin)\b/g,
      cs: /\b(je|jsou|byl|byla|bylo|bude|může|velmi|pouze|které)\b/g,
    };

    let maxMatches = 0;
    let detectedLang = 'en'; // default

    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = (sample.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }
}

// Singleton instance
export const translationService = new TranslationService();

// Удобные функции для использования в компонентах
export async function translateArticle(
  article: { title: string; excerpt: string; body: string },
  targetLanguage: string
) {
  return translationService.translateContent(article, targetLanguage);
}

export async function translateToAllLanguages(
  article: { title: string; excerpt: string; body: string },
  excludeLanguages: string[] = []
) {
  return translationService.translateToAllLanguages(article, excludeLanguages);
}

export function isTranslationAvailable(): boolean {
  return translationService.isAvailable();
}
