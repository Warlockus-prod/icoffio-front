/**
 * TELEGRAM SIMPLE - CONTENT PROCESSOR
 * 
 * AI улучшение контента через OpenAI
 * ✅ v8.7.5: Full logging integration
 */

import OpenAI from 'openai';
import type { ProcessedArticle } from './types';
import { systemLogger } from '@/lib/system-logger';

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
  const startTime = Date.now();
  
  await systemLogger.info('telegram', 'process_text', 'Starting AI content processing', {
    textLength: text.length,
    contentStyle,
    hasUserTitle: !!userTitle,
  });

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
- **FORMAT:** Plain text with NO markdown syntax (NO #, NO **, NO *, NO markdown at all)
- **STRUCTURE:** Use natural paragraph breaks. Create clear sections with smooth transitions between paragraphs.
- **STYLE:** ${styleInstructions}
- **CONTEXT PROCESSING:** Analyze the ENTIRE source material comprehensively. Understand the full context, implications, and relationships between facts. Don't just rewrite sentences - create a cohesive narrative that flows naturally.
- **TITLE:** ${userTitle ? `Create engaging version of: "${userTitle}"` : 'Create compelling headline from core facts'}

CRITICAL FORMATTING RULES:
- ❌ NO markdown headers (# ## ###)
- ❌ NO markdown bold (**text**)
- ❌ NO markdown italic (*text*)
- ❌ NO markdown lists (- or *)
- ✅ Use plain text paragraphs separated by double line breaks
- ✅ Use natural language emphasis through word choice, not formatting
- ✅ Create smooth transitions between ideas
- ✅ Write in a flowing, narrative style appropriate for ${contentStyle} style

OUTPUT (JSON only, nothing else):
{
  "title": "Your rewritten headline IN ENGLISH",
  "content": "Your completely rewritten article IN PLAIN TEXT (NO markdown, NO #, NO **, just paragraphs separated by \\n\\n)",
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
          content: `You are a professional tech journalist who REWRITES content in your own words. NEVER copy phrases from source material. Create original, professional articles in ${contentStyle} style. 

CRITICAL: Output content as PLAIN TEXT only - NO markdown syntax (#, **, *, etc.). Use natural paragraph breaks (\\n\\n) to separate sections. Write in a flowing, narrative style that processes the entire context comprehensively.

Output only valid JSON.`,
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
    await systemLogger.info('telegram', 'process_text', 'AI response received', {
      duration_ms: duration,
      model: 'gpt-4o-mini',
    });

    // Parse response
    const content = response.choices[0].message.content;
    if (!content) {
      await systemLogger.error('telegram', 'process_text', 'Empty AI response', {});
      throw new Error('Empty AI response');
    }

    const result = JSON.parse(content);
    
    await systemLogger.debug('telegram', 'process_text', 'AI response parsed', {
      hasTitle: !!result.title,
      hasContent: !!result.content,
      hasExcerpt: !!result.excerpt,
      hasCategory: !!result.category,
    });
    
    // ✅ v8.7.6: Post-processing cleanup - remove ALL markdown syntax and promotional text
    let cleanedContent = result.content || '';
    
    // ✅ v8.7.6: Remove ALL markdown syntax first
    cleanedContent = cleanedContent
      .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers (# ## ### #### ##### ######)
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold (**text**)
      .replace(/\*(.+?)\*/g, '$1') // Remove italic (*text*)
      .replace(/__(.+?)__/g, '$1') // Remove bold (__text__)
      .replace(/_(.+?)_/g, '$1') // Remove italic (_text_)
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links [text](url) -> text
      .replace(/`(.+?)`/g, '$1') // Remove inline code (`code`)
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^[-*+]\s+/gm, '') // Remove list markers (- * +)
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers (1. 2. 3.)
      .replace(/^>\s+/gm, '') // Remove blockquote markers (>)
      .replace(/^\|\s*.+\s*\|/gm, '') // Remove table rows (| col |)
      .replace(/^---+$/gm, '') // Remove horizontal rules (---)
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .trim();
    
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
      /hello!.*?/gi, // ✅ v8.7.6: Remove casual greetings
      /if you're interested.*?/gi, // ✅ v8.7.6: Remove casual phrases
      /you might be wondering.*?/gi, // ✅ v8.7.6: Remove casual phrases
    ];
    
    for (const pattern of promotionalPatterns) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }
    
    // ✅ v8.7.6: Normalize paragraph breaks and whitespace
    cleanedContent = cleanedContent
      .replace(/\n{3,}/g, '\n\n') // Max 2 newlines (paragraph breaks)
      .replace(/[ \t]+/g, ' ') // Single space
      .replace(/\n\s+/g, '\n') // Remove leading spaces on new lines
      .replace(/\s+\n/g, '\n') // Remove trailing spaces before new lines
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

    const totalDuration = Date.now() - startTime;
    await systemLogger.info('telegram', 'process_text', 'Content processing completed', {
      title: article.title,
      wordCount: article.wordCount,
      category: article.category,
      duration_ms: totalDuration,
    });

    return article;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    await systemLogger.error('telegram', 'process_text', 'AI processing failed', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
      textLength: text.length,
    });
    
    // Fallback: return original text with basic formatting
    await systemLogger.warn('telegram', 'process_text', 'Using fallback (original text)', {
      textLength: text.length,
    });
    
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
 * Get style-specific instructions for AI (v8.7.6 - Enhanced)
 */
function getStyleInstructions(style: string): string {
  const styles: Record<string, string> = {
    'journalistic': `Write in engaging, professional journalistic style for wide audience. Clear, informative, and accessible. Process the ENTIRE context comprehensively - understand relationships between facts, implications, and broader significance. Create a cohesive narrative that flows naturally from introduction through key points to conclusion. Use smooth transitions between paragraphs.`,
    'keep_as_is': `Keep the original writing style and tone. Make minimal changes, only fix grammar and formatting. Preserve the author's voice. Process the full context but maintain the original approach.`,
    'seo_optimized': `Optimize for SEO: use keywords naturally, create descriptive sections, include relevant terms. Focus on search engine visibility. Process the entire context comprehensively and create a well-structured narrative that naturally incorporates SEO elements.`,
    'academic': `Write in formal, scientific academic style. Use precise terminology, cite concepts properly, maintain scholarly tone. Process the full context analytically - examine relationships, implications, and theoretical frameworks. Create a structured, logical argument.`,
    'casual': `Write in friendly, conversational casual style. Use simple language, be approachable and engaging. Like talking to a friend. Process the entire context but present it in an accessible, relatable way. Use natural transitions and friendly tone throughout.`,
    'technical': `Write in detailed, precise technical style. Use accurate terminology, explain technical concepts thoroughly, be comprehensive. Process the entire context deeply - understand technical relationships, specifications, and implications. Create a thorough, well-structured technical narrative.`,
  };
  
  return styles[style] || styles['journalistic'];
}

