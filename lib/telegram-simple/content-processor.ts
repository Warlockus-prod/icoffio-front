/**
 * TELEGRAM SIMPLE - CONTENT PROCESSOR
 * 
 * AI улучшение контента через OpenAI
 */

import OpenAI from 'openai';
import type { ProcessedArticle } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process text with AI to create professional article
 */
export async function processText(
  text: string,
  userTitle?: string
): Promise<ProcessedArticle> {
  console.log(`[TelegramSimple] 🤖 Processing with AI (${text.length} chars)...`);

  try {
    // Create prompt
    const prompt = `
You are a professional tech article writer. Transform the following text into a well-structured, engaging article.

SOURCE TEXT:
${text}

CRITICAL REQUIREMENTS:
- **ALL OUTPUT MUST BE IN ENGLISH** (translate if source is in another language)
- Write in clear, professional English
- Target length: 400-600 words
- Use proper Markdown formatting with ## headings
- Make it informative and engaging
- Focus on key points and insights
- Add relevant context if needed
${userTitle ? `- Translate and use this title: "${userTitle}"` : '- Create an engaging English title'}

OUTPUT FORMAT (JSON):
{
  "title": "Engaging article title IN ENGLISH",
  "content": "Full article content in Markdown with ## headings IN ENGLISH",
  "excerpt": "Brief 1-2 sentence summary (max 200 chars) IN ENGLISH",
  "category": "One of: ai, tech, gadgets, software, hardware, internet, security"
}

IMPORTANT: If source text is in Russian, Chinese, or any other language - TRANSLATE EVERYTHING to English!

Return ONLY valid JSON, no other text.
`.trim();

    // Call OpenAI
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
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
        const translateResponse = await openai.chat.completions.create({
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

