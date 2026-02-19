/**
 * TELEGRAM SIMPLE - CONTENT PROCESSOR
 * 
 * AI улучшение контента через OpenAI
 */

import OpenAI from 'openai';
import type { ProcessedArticle } from './types';

// Lazy initialization to avoid build errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

/**
 * Process text with AI to create professional article
 */
export async function processText(
  text: string,
  userTitle?: string,
  contentStyle: string = 'journalistic'
): Promise<ProcessedArticle> {
  console.log(`[TelegramSimple] 🤖 Processing with AI (${text.length} chars, style: ${contentStyle})...`);

  try {
    // Get style-specific instructions
    const styleInstructions = getStyleInstructions(contentStyle);
    
    // Create prompt
    const prompt = `
You are a professional tech article writer. Transform the following text into a well-structured article.

SOURCE TEXT:
${text}

CRITICAL REQUIREMENTS:
- **ALL OUTPUT MUST BE IN ENGLISH** (translate if source is in another language)
- ${styleInstructions}
- Target length: 400-600 words
- Use proper Markdown formatting with ## headings
- Focus on key points and insights
${userTitle ? `- Translate and use this title: "${userTitle}"` : '- Create an engaging English title'}

TITLE RULES:
- Title MUST be between 55 and 95 characters long
- If the original title is too long, REPHRASE it shorter while preserving the key meaning
- Do NOT simply truncate — the title must be a complete, meaningful sentence
- Preserve important numbers, names, and facts in the title

CONTENT CLEANING (mandatory):
- Remove ALL promotional text: newsletter signups, subscription prompts, "follow us", social media links
- Remove ALL copyright notices, disclaimers, "about the author" sections
- Remove ALL cookie/privacy notices that leaked into content
- Remove ALL "related articles", "read more", or "you might also like" sections
- Remove ALL calls to action or self-promotion from the source
- The output must read as a standalone, professional article with no traces of the original website

OUTPUT FORMAT (JSON):
{
  "title": "Article title IN ENGLISH (55-95 characters)",
  "content": "Full article content in Markdown with ## headings IN ENGLISH",
  "excerpt": "Brief 1-2 sentence summary (max 200 chars) IN ENGLISH",
  "category": "One of: ai, tech, gadgets, software, hardware, internet, security"
}

IMPORTANT: If source text is in Russian, Chinese, or any other language - TRANSLATE EVERYTHING to English!

Return ONLY valid JSON, no other text.
`.trim();

    // Call OpenAI
    const startTime = Date.now();
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper than gpt-4
      messages: [
        {
          role: 'system',
          content: 'You are a professional tech journalist. Output only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const duration = Date.now() - startTime;
    console.log(`[TelegramSimple] ⚡ AI response received (${duration}ms)`);

    // Parse response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty AI response');
    }

    const result = JSON.parse(content);

    // Check if title contains non-English characters (Cyrillic, Chinese, etc.)
    const title = result.title || userTitle || 'Untitled Article';
    const hasNonEnglish = /[^\x00-\x7F]/g.test(title);
    
    let finalTitle = title;
    
    // If title has non-English characters, force translation
    if (hasNonEnglish) {
      console.log(`[TelegramSimple] ⚠️ Title contains non-English characters, translating...`);
      try {
        const translateResponse = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate titles to English accurately.',
            },
            {
              role: 'user',
              content: `Translate this title to English: "${title}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 100,
        });
        
        finalTitle = translateResponse.choices[0].message.content?.trim() || title;
        console.log(`[TelegramSimple] ✅ Translated title: "${finalTitle}"`);
      } catch (error) {
        console.error('[TelegramSimple] Translation failed, using original:', error);
      }
    }

    // Validate and prepare article
    const article: ProcessedArticle = {
      title: finalTitle,
      content: result.content || text,
      excerpt: result.excerpt || result.content?.substring(0, 200) || 'No excerpt',
      category: validateCategory(result.category),
      wordCount: countWords(result.content || text),
    };

    console.log(`[TelegramSimple] ✅ Article processed: "${article.title}" (${article.wordCount} words, ${article.category})`);

    return article;

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ AI processing error:', error.message);
    
    // Fallback: return original text with basic formatting
    console.log('[TelegramSimple] 📝 Using fallback (original text)');
    
    return {
      title: userTitle || 'Article from Telegram',
      content: text,
      excerpt: text.substring(0, 200),
      category: 'tech',
      wordCount: countWords(text),
    };
  }
}

/**
 * Validate and normalize category
 */
function validateCategory(category: string | undefined): string {
  const validCategories = ['ai', 'tech', 'gadgets', 'software', 'hardware', 'internet', 'security'];
  
  if (category && validCategories.includes(category.toLowerCase())) {
    return category.toLowerCase();
  }
  
  return 'tech'; // Default
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get style-specific instructions for AI (v8.5.0)
 */
function getStyleInstructions(style: string): string {
  const styles: Record<string, string> = {
    'journalistic': 'Write in engaging, professional journalistic style for wide audience. Clear, informative, and accessible.',
    'keep_as_is': 'Keep the original writing style and tone. Make minimal changes, only fix grammar and formatting. Preserve the author\'s voice.',
    'seo_optimized': 'Optimize for SEO: use keywords naturally, create descriptive headings, include relevant terms. Focus on search engine visibility.',
    'academic': 'Write in formal, scientific academic style. Use precise terminology, cite concepts properly, maintain scholarly tone.',
    'casual': 'Write in friendly, conversational casual style. Use simple language, be approachable and engaging. Like talking to a friend.',
    'technical': 'Write in detailed, precise technical style. Use accurate terminology, explain technical concepts thoroughly, be comprehensive.',
  };
  
  return styles[style] || styles['journalistic'];
}

