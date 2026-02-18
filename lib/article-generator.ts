import { translationService } from './translation-service';
import type { Post } from './types';
import { addRuntimeArticle } from './local-articles';

interface ArticleInput {
  url?: string;
  title?: string;
  content?: string;
  category?: string;
  source?: string;
}

interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  slug: string;
  images: string[];
}

class ArticleGenerator {
  private supportedLanguages = ['en', 'pl', 'de', 'ro', 'cs'];

  // Извлечение контента из URL (базовая реализация)
  async extractContentFromUrl(url: string): Promise<ArticleInput> {
    console.log(`🌐 Извлекаем контент из URL: ${url}`);
    
    // Здесь можно добавить реальную логику парсинга URL
    // Пока возвращаем заглушку для демонстрации
    const domain = new URL(url).hostname;
    
    return {
      url,
      title: `Статья с ${domain}`,
      content: `Контент извлечен из ${url}. Здесь будет реальный контент после реализации парсера.`,
      category: 'tech',
      source: domain
    };
  }

  // Генерация адаптированного контента с помощью ИИ
  async generateAdaptedContent(input: ArticleInput): Promise<GeneratedArticle> {
    console.log(`🔄 Генерируем адаптированный контент...`);
    
    const prompt = this.createContentGenerationPrompt(input);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      const data = await response.json();
      const generatedContent = data.choices?.[0]?.message?.content;

      if (!generatedContent) {
        throw new Error('Не удалось сгенерировать контент');
      }

      return this.parseGeneratedContent(generatedContent);
      
    } catch (error) {
      console.error('❌ Ошибка генерации контента:', error);
      
      // Fallback: создаем базовую структуру
      return {
        title: input.title || 'Новая статья',
        excerpt: 'Краткое описание статьи',
        content: input.content || 'Содержимое статьи',
        category: input.category || 'tech',
        slug: this.createSlug(input.title || 'novaya-statya'),
        images: this.selectDefaultImages(input.category || 'tech')
      };
    }
  }

  // Создание промпта для генерации контента
  private createContentGenerationPrompt(input: ArticleInput): string {
    return `Создай качественную техническую статью на русском языке для сайта icoffio.

Исходные данные:
${input.url ? `URL: ${input.url}` : ''}
${input.title ? `Заголовок: ${input.title}` : ''}
${input.content ? `Исходный контент: ${input.content.slice(0, 2000)}...` : ''}
${input.category ? `Категория: ${input.category}` : ''}

Требования:
1. Адаптируй контент под техническую аудиторию
2. Создай структурированную статью с подзаголовками
3. Добавь технические детали и экспертные комментарии
4. Включи практические примеры где возможно
5. Используй современную терминологию

Верни результат в следующем JSON формате:
{
  "title": "Заголовок статьи (привлекательный и SEO-оптимизированный)",
  "excerpt": "Краткое описание статьи (150-200 символов)",
  "content": "Полное содержание статьи в HTML формате с правильной структурой",
  "category": "ai|apple|games|tech",
  "slug": "url-friendly-slug",
  "images": ["image1.jpg", "image2.jpg", "image3.jpg"]
}

Важно: Контент должен быть оригинальным, качественным и релевантным для технического сайта.`;
  }

  // Парсинг сгенерированного контента
  private parseGeneratedContent(content: string): GeneratedArticle {
    try {
      // Попытка извлечь JSON из ответа
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || 'Новая статья',
          excerpt: parsed.excerpt || 'Краткое описание',
          content: parsed.content || 'Содержимое статьи',
          category: parsed.category || 'tech',
          slug: parsed.slug || this.createSlug(parsed.title || 'novaya-statya'),
          images: parsed.images || this.selectDefaultImages(parsed.category || 'tech')
        };
      }
    } catch (error) {
      console.warn('Не удалось распарсить JSON, используем fallback');
    }

    // Fallback парсинг
    const lines = content.split('\n');
    const title = lines.find(line => line.includes('title'))?.replace(/.*title["']:?\s*["']?/, '').replace(/["'].*/, '') || 'Новая статья';
    
    return {
      title,
      excerpt: 'Краткое описание статьи',
      content: content,
      category: 'tech',
      slug: this.createSlug(title),
      images: this.selectDefaultImages('tech')
    };
  }

  // Создание slug из заголовка
  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Подбор изображений по категории
  private selectDefaultImages(category: string): string[] {
    const imageMap: Record<string, string[]> = {
      ai: [
        '/images/ai-technology.jpg',
        '/images/machine-learning.jpg',
        '/images/ai-future.jpg'
      ],
      apple: [
        '/images/apple-devices.jpg',
        '/images/iphone-technology.jpg',
        '/images/apple-innovation.jpg'
      ],
      games: [
        '/images/gaming-technology.jpg',
        '/images/game-development.jpg',
        '/images/gaming-industry.jpg'
      ],
      tech: [
        '/images/technology-innovation.jpg',
        '/images/tech-devices.jpg',
        '/images/digital-transformation.jpg'
      ]
    };

    return imageMap[category] || imageMap.tech;
  }

  // Перевод статьи на все языки
  async translateArticle(article: GeneratedArticle): Promise<Record<string, GeneratedArticle>> {
    console.log(`🌐 Переводим статью "${article.title}" на ${this.supportedLanguages.length} языков...`);
    
    const translations: Record<string, GeneratedArticle> = {};

    for (const language of this.supportedLanguages) {
      try {
        console.log(`🔄 Переводим на ${language}...`);
        
        const translatedContent = await translationService.translateContent(
          {
            title: article.title,
            excerpt: article.excerpt,
            body: article.content
          },
          language
        );

        translations[language] = {
          ...article,
          title: translatedContent.title,
          excerpt: translatedContent.excerpt,
          content: translatedContent.body,
        };

        // Небольшая задержка между переводами
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Ошибка перевода на ${language}:`, error);
        
        // Fallback к оригиналу
        translations[language] = article;
      }
    }

    return translations;
  }

  // Создание Post объекта
  private createPostObject(article: GeneratedArticle, language: string = 'ru'): Post {
    const now = new Date();
    
    return {
      slug: `${article.slug}${language !== 'ru' ? `-${language}` : ''}`,
      title: article.title,
      excerpt: article.excerpt,
      date: now.toISOString(),
      publishedAt: now.toISOString(),
      image: article.images[0],
      imageAlt: article.title,
      category: { 
        name: this.getCategoryName(article.category), 
        slug: article.category 
      },
      images: article.images,
      contentHtml: this.wrapContentInProse(article.content)
    };
  }

  // Получение названия категории
  private getCategoryName(slug: string): string {
    const categoryNames: Record<string, string> = {
      ai: 'AI',
      apple: 'Apple',
      games: 'Games',
      tech: 'Tech'
    };
    
    return categoryNames[slug] || 'Tech';
  }

  // Обертка контента в prose стили
  private wrapContentInProse(content: string): string {
    if (content.includes('<div class="prose')) {
      return content;
    }

    return `<div class="prose prose-lg max-w-none">\n${content}\n</div>`;
  }

  // Главный метод - полная обработка статьи
  async processArticle(input: ArticleInput): Promise<Record<string, Post>> {
    try {
      console.log(`🚀 Начинаем обработку статьи...`);
      
      // 1. Извлекаем контент (если нужно)
      let articleData = input;
      if (input.url && !input.content) {
        articleData = await this.extractContentFromUrl(input.url);
      }

      // 2. Генерируем адаптированный контент
      const generatedArticle = await this.generateAdaptedContent(articleData);
      console.log(`✅ Сгенерирован контент: "${generatedArticle.title}"`);

      // 3. Переводим на все языки
      const translations = await this.translateArticle(generatedArticle);
      console.log(`✅ Переведено на ${Object.keys(translations).length} языков`);

      // 4. Создаем Post объекты
      const posts: Record<string, Post> = {};
      
      // Добавляем русскую версию
      posts['ru'] = this.createPostObject(generatedArticle, 'ru');
      
      // Добавляем переводы
      for (const [language, translatedArticle] of Object.entries(translations)) {
        posts[language] = this.createPostObject(translatedArticle, language);
      }

      console.log(`🎉 Статья успешно обработана и переведена!`);
      return posts;
      
    } catch (error) {
      console.error('❌ Ошибка обработки статьи:', error);
      throw error;
    }
  }

  // Метод для добавления статьи в систему (cloud-ready)
  async addArticleToSystem(posts: Record<string, Post>): Promise<void> {
    // В cloud среде статьи добавляются прямо в память
    // Для production можно интегрировать с CMS или базой данных
    
    for (const [language, post] of Object.entries(posts)) {
      // Добавляем в локальный массив (будет работать до следующего деплоя)
      addRuntimeArticle(post);
      console.log(`📝 Добавлена статья "${post.title}" (${language})`);
    }

    // В будущем здесь можно добавить интеграцию с:
    // - Headless CMS (Strapi, Contentful)
    // - Database (PostgreSQL, MongoDB) 
    // - GitHub API для создания PR с новой статьей
    // - n8n webhook для автоматизации
    
    console.log(`🚀 Статьи готовы к публикации на web.icoffio.com`);
  }

  // Метод для создания GitHub PR с новой статьей (опциональный)
  async createGitHubPR(posts: Record<string, Post>): Promise<void> {
    // Эта функция может быть реализована для автоматического
    // создания Pull Request с новой статьей в GitHub
    console.log(`🔄 GitHub integration not implemented yet`);
  }
}

// Экспорт singleton
export const articleGenerator = new ArticleGenerator();

// Удобная функция для использования
export async function generateArticleFromUrl(url: string): Promise<Record<string, Post>> {
  return articleGenerator.processArticle({ url });
}

export async function generateArticleFromText(title: string, content: string, category?: string): Promise<Record<string, Post>> {
  return articleGenerator.processArticle({ title, content, category });
}
