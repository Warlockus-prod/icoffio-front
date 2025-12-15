/**
 * TELEGRAM SIMPLE - URL PARSER
 * 
 * Простой парсинг URL для извлечения контента
 */

import * as cheerio from 'cheerio';
import type { ParsedUrl } from './types';

/**
 * Parse URL and extract title + content
 */
export async function parseUrl(url: string): Promise<ParsedUrl> {
  console.log(`[TelegramSimple] 🔗 Parsing URL: ${url}`);

  try {
    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; icoffio-bot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    let title = '';
    
    // Try multiple selectors for title
    const titleSelectors = [
      'h1',
      'article h1',
      '.article-title',
      '[class*="title"]',
      'title',
    ];

    for (const selector of titleSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 10) {
        title = text;
        break;
      }
    }

    // Extract content paragraphs
    const paragraphs: string[] = [];
    
    // Try article content first
    const contentSelectors = [
      'article p',
      '.article-content p',
      '.post-content p',
      '[class*="content"] p',
      'main p',
      'p',
    ];

    let foundContent = false;
    for (const selector of contentSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        // Filter out short paragraphs (likely navigation/footer)
        if (text.length > 50) {
          paragraphs.push(text);
          foundContent = true;
        }
      });
      
      if (foundContent && paragraphs.length >= 3) {
        break; // Got enough content
      }
    }

    if (paragraphs.length === 0) {
      throw new Error('No content found on page');
    }

    const content = paragraphs.join('\n\n');

    console.log(`[TelegramSimple] ✅ Parsed: "${title}" (${content.length} chars)`);

    return {
      title: title || 'Untitled Article',
      content,
    };

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ Parse error:', error.message);
    throw new Error(`Failed to parse URL: ${error.message}`);
  }
}

