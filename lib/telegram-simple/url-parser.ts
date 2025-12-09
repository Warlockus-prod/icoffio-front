/**
 * TELEGRAM SIMPLE - URL PARSER
 * 
 * Простой парсинг URL для извлечения контента
 * ✅ v8.7.5: Full logging integration
 */

import * as cheerio from 'cheerio';
import type { ParsedUrl } from './types';
import { systemLogger } from '@/lib/system-logger';

/**
 * Parse URL and extract title + content
 */
export async function parseUrl(url: string): Promise<ParsedUrl> {
  const startTime = Date.now();
  
  await systemLogger.info('telegram', 'parse_url', 'Starting URL parsing', {
    url: url.substring(0, 100),
  });

  try {
    // Fetch HTML
    const fetchTimer = systemLogger.startTimer('telegram', 'parse_url', 'Fetching HTML');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; icoffio-bot/1.0)',
      },
    });

    if (!response.ok) {
      await fetchTimer.error('HTTP fetch failed', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    await fetchTimer.success('HTML fetched', {
      htmlLength: html.length,
    });
    
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

    const duration = Date.now() - startTime;
    await systemLogger.info('telegram', 'parse_url', 'URL parsed successfully', {
      url: url.substring(0, 100),
      title: title || 'Untitled Article',
      contentLength: content.length,
      paragraphsCount: paragraphs.length,
      duration_ms: duration,
    });

    return {
      title: title || 'Untitled Article',
      content,
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    await systemLogger.error('telegram', 'parse_url', 'URL parsing failed', {
      url: url.substring(0, 100),
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    });
    throw new Error(`Failed to parse URL: ${error.message}`);
  }
}

