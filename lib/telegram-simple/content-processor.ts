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
    
    // Create prompt - v8.7.2: Comprehensive content adaptation
    const prompt = `
You are a professional tech journalist creating an ORIGINAL ADAPTED article based on source material.

YOUR TASK: Write a completely rewritten, professional article. NOT a copy, NOT a translation - a NEW article that covers the same topic.

SOURCE MATERIAL (use as reference only):
${text}

WRITING APPROACH:
1. **REWRITE COMPLETELY** - Create fresh text in your own words
2. **EXTRACT KEY FACTS** - What happened? Who? What? When? Why? Impact?
3. **ADD CONTEXT** - Explain technical terms, provide background
4. **STRUCTURE LOGICALLY** - Introduction → Key Points → Details → Conclusion
5. ${styleInstructions}

NEVER INCLUDE (these are website artifacts, not article content):
- Subscription prompts ("subscribe", "follow us", "stay with us", "join our newsletter")
- Social media calls ("share", "like", "repost", "follow on Twitter")
- Source attributions ("Source:", "via:", "Источник:", "by [author name]")
- Dates and timestamps (unless relevant to the story)
- Author bios and signatures
- Related articles suggestions
- Comments or reactions counts
- Any text that sounds like website UI, not article content

REQUIREMENTS:
- **LANGUAGE: ENGLISH ONLY** (translate all content)
- **LENGTH: 400-600 words** of pure article content
- **FORMAT: Markdown** with ## headings (2-4 sections)
- **TONE: Professional tech journalism**
${userTitle ? `- **TITLE:** Use this as inspiration: "${userTitle}"` : '- **TITLE:** Create engaging headline from the core news'}

OUTPUT (JSON only):
{
  "title": "Compelling headline IN ENGLISH",
  "content": "Full article in Markdown IN ENGLISH",
  "excerpt": "1-2 sentence summary, max 160 chars",
  "category": "ai|tech|gadgets|software|hardware|internet|security"
}
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

