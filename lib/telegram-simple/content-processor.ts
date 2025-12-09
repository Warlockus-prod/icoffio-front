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
    
    // Create prompt - v8.7.3: RADICAL content rewriting with examples
    const prompt = `
You are a professional tech journalist. Your job is to READ source material and CREATE A COMPLETELY NEW ARTICLE about the same topic.

⚠️ CRITICAL: DO NOT COPY ANY PHRASES from the source. Every sentence must be YOUR OWN WORDS.

SOURCE MATERIAL (for facts only):
---
${text}
---

YOUR MISSION:
1. READ the source → EXTRACT key facts (who, what, when, where, why, impact)
2. FORGET the exact wording → CREATE fresh sentences in your voice
3. ADD professional context and analysis
4. STRUCTURE logically: Intro → Key Points → Details → Impact
5. ${styleInstructions}

❌ BAD EXAMPLE (copying):
Source: "Stay with us on Google News! Subscribe to our channel!"
Bad output: "Stay with us on Google News for more updates."

✅ GOOD EXAMPLE (rewriting):
Source: "New AI chatbot launched by Google. Stay with us!"
Good output: "Google has unveiled a groundbreaking AI-powered chatbot designed to revolutionize digital conversations."

FORBIDDEN CONTENT (pure website noise, NOT news):
- Calls to action: "subscribe", "follow", "stay with us", "join", "share", "like"
- Source credits: "via", "source:", "by [name]", "according to [site]"
- UI elements: "read more", "comments (123)", "related:", "tags:"
- Author info: bios, signatures, "written by"
- Timestamps (unless part of the actual story)

THINK: "If this phrase sounds like website UI or marketing copy rather than journalism - DON'T include it!"

REQUIREMENTS:
- **LENGTH:** 400-600 words (pure article, no fluff)
- **LANGUAGE:** English only (translate all foreign text)
- **FORMAT:** Markdown with 2-4 ## headings
- **STYLE:** Professional tech journalism
- **TITLE:** ${userTitle ? `Create engaging version of: "${userTitle}"` : 'Create compelling headline from core facts'}

OUTPUT (JSON only, nothing else):
{
  "title": "Your rewritten headline IN ENGLISH",
  "content": "Your completely rewritten article IN ENGLISH with ## headings",
  "excerpt": "Your 1-2 sentence summary, max 160 chars",
  "category": "ai|tech|gadgets|software|hardware|internet|security"
}
`.trim();

    // Call OpenAI - v8.7.3: Enhanced for creative rewriting
    const startTime = Date.now();
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper than gpt-4
      messages: [
        {
          role: 'system',
          content: 'You are a professional tech journalist who REWRITES content in your own words. NEVER copy phrases from source material. Create original, professional articles. Output only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9, // Higher creativity for better rewriting
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
    
    // ✅ v8.7.3: Post-processing cleanup for any remaining promotional text
    let cleanedContent = result.content || '';
    
    // Remove common promotional patterns (case-insensitive)
    const promotionalPatterns = [
      /stay with us.*?[.!]/gi,
      /follow us.*?[.!]/gi,
      /subscribe.*?channel.*?[.!]/gi,
      /join.*?newsletter.*?[.!]/gi,
      /google news.*?[.!]/gi,
      /будьте с нами.*?[.!]/gi,
      /подпишитесь.*?[.!]/gi,
      /источник:.*?[.!]/gi,
      /via:.*?[.!]/gi,
      /source:.*?[.!]/gi,
      /written by.*?[.!]/gi,
      /by \[.*?\]/gi,
      /share this.*?[.!]/gi,
      /like and.*?[.!]/gi,
    ];
    
    for (const pattern of promotionalPatterns) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }
    
    // Remove excessive whitespace and empty lines
    cleanedContent = cleanedContent
      .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
      .replace(/[ \t]+/g, ' ') // Single space
      .trim();

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

    // Validate and prepare article - v8.7.3: Use cleaned content
    const article: ProcessedArticle = {
      title: finalTitle,
      content: cleanedContent || text,
      excerpt: result.excerpt || cleanedContent.substring(0, 200) || 'No excerpt',
      category: validateCategory(result.category),
      wordCount: countWords(cleanedContent || text),
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

