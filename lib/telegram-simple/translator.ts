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
- ✅ CRITICAL: Title MUST be maximum 160 characters (for SEO)
- ✅ CRITICAL: Content should be PLAIN TEXT - NO markdown syntax (#, **, *, etc.)
- ✅ CRITICAL: Use natural paragraph breaks (\\n\\n) instead of markdown headers
- Maintain technical terms appropriately
- Keep the same structure and tone
- Preserve technical accuracy

OUTPUT FORMAT (JSON):
{
  "title": "Tytuł artykułu po polsku (MAX 160 znaków!)",
  "content": "Pełna treść artykułu po polsku w PLAIN TEXT (NO markdown, NO #, NO **)",
  "excerpt": "Krótkie podsumowanie po polsku (max 160 znaków)"
}

CRITICAL FORMATTING RULES:
- ❌ NO markdown headers (# ## ###)
- ❌ NO markdown bold (**text**)
- ❌ NO markdown italic (*text*)
- ❌ NO markdown lists (- or *)
- ✅ Use plain text paragraphs separated by double line breaks
- ✅ Title: MAX 160 characters (shorter is better for SEO)

Return ONLY valid JSON, no other text.
`.trim();

    const startTime = Date.now();
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional Polish translator specializing in technology articles. CRITICAL: Title must be maximum 160 characters. Content must be PLAIN TEXT without markdown syntax (#, **, *, etc.). Use natural paragraph breaks instead of markdown headers.',
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

    // ✅ v8.7.6: Ensure title is max 160 characters
    let polishTitle = result.title || article.title;
    if (polishTitle.length > 160) {
      console.log(`[TelegramSimple] ⚠️ Polish title too long (${polishTitle.length} chars), truncating to 160...`);
      // Try to truncate at sentence boundary
      const truncated = polishTitle.substring(0, 157);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastPeriod > 120) {
        polishTitle = truncated.substring(0, lastPeriod + 1);
      } else if (lastSpace > 120) {
        polishTitle = truncated.substring(0, lastSpace) + '...';
      } else {
        polishTitle = truncated + '...';
      }
      
      console.log(`[TelegramSimple] ✅ Title truncated: "${polishTitle}" (${polishTitle.length} chars)`);
    }

    // ✅ v8.7.6: Clean markdown from content
    let polishContent = result.content || article.content;
    
    // Remove ALL markdown syntax
    polishContent = polishContent
      .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/__(.+?)__/g, '$1') // Remove bold (__)
      .replace(/_(.+?)_/g, '$1') // Remove italic (_)
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .replace(/[ \t]+/g, ' ') // Single space
      .trim();

    // ✅ v8.7.6: Ensure excerpt is max 160 characters
    let polishExcerpt = result.excerpt || article.excerpt;
    if (polishExcerpt.length > 160) {
      const truncated = polishExcerpt.substring(0, 157);
      const lastPeriod = truncated.lastIndexOf('.');
      if (lastPeriod > 100) {
        polishExcerpt = truncated.substring(0, lastPeriod + 1);
      } else {
        polishExcerpt = truncated + '...';
      }
    }

    console.log(`[TelegramSimple] ✅ Translated to Polish: "${polishTitle}" (${polishTitle.length} chars)`);

    return {
      title: polishTitle,
      content: polishContent,
      excerpt: polishExcerpt,
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

