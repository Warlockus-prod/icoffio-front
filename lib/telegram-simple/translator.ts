/**
 * TELEGRAM SIMPLE - TRANSLATOR
 * 
 * Перевод статей с английского на польский
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
 * Translate article from English to Polish
 */
export async function translateToPolish(
  article: ProcessedArticle
): Promise<{
  title: string;
  content: string;
  excerpt: string;
}> {
  console.log(`[TelegramSimple] 🇵🇱 Translating to Polish: "${article.title}"`);

  try {
    const prompt = `
Translate the following tech article from English to Polish.

ENGLISH TITLE:
${article.title}

ENGLISH CONTENT:
${article.content}

ENGLISH EXCERPT:
${article.excerpt}

REQUIREMENTS:
- Translate to natural, professional Polish
- Keep all Markdown formatting (##, **, lists, etc.)
- Maintain technical terms appropriately
- Keep the same structure and tone
- Preserve all links and technical accuracy
- Polish title MUST be between 55 and 95 characters. If translation is too long, rephrase shorter while keeping the meaning. Do NOT truncate mid-word or mid-number

OUTPUT FORMAT (JSON):
{
  "title": "Tytuł artykułu po polsku",
  "content": "Pełna treść artykułu po polsku w Markdown",
  "excerpt": "Krótkie podsumowanie po polsku (max 200 znaków)"
}

Return ONLY valid JSON, no other text.
`.trim();

    const startTime = Date.now();
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional Polish translator specializing in technology articles.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower for more accurate translation
      max_tokens: 2500,
    });

    const duration = Date.now() - startTime;
    console.log(`[TelegramSimple] ⚡ Polish translation received (${duration}ms)`);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty translation response');
    }

    const result = JSON.parse(content);

    console.log(`[TelegramSimple] ✅ Translated to Polish: "${result.title}"`);

    return {
      title: result.title || article.title,
      content: result.content || article.content,
      excerpt: result.excerpt || article.excerpt,
    };

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ Translation error:', error.message);
    
    // Fallback: return original English version
    console.log('[TelegramSimple] 📝 Using English fallback for Polish version');
    return {
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
    };
  }
}

