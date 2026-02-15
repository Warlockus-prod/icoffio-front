/**
 * TELEGRAM IMAGE GENERATOR v8.5.1
 * 
 * Generates and inserts images into article content
 * Based on user settings (count, source)
 */

import { buildTitleKeywordPhrase, extractTitleKeywords } from '../image-keywords';

const BASE_URL = 'https://app.icoffio.com';

export interface ImageGenerationOptions {
  imagesCount: number; // 0-3
  imagesSource: 'unsplash' | 'ai' | 'none';
  title: string;
  excerpt: string;
  category: string;
}

/**
 * Generate images and insert them into content
 */
export async function insertImages(
  content: string,
  options: ImageGenerationOptions
): Promise<string> {
  const { imagesCount, imagesSource, title, excerpt, category } = options;

  console.log(`[TelegramImages] Inserting ${imagesCount} images from ${imagesSource}...`);

  // No images requested
  if (imagesCount === 0 || imagesSource === 'none') {
    console.log('[TelegramImages] No images requested');
    return content;
  }

  try {
    // Generate images in parallel
    const imageUrls = await generateImages(imagesCount, imagesSource, title, excerpt, category);

    if (imageUrls.length === 0) {
      console.warn('[TelegramImages] No images generated, returning original content');
      return content;
    }

    console.log(`[TelegramImages] ✅ Generated ${imageUrls.length} images`);

    // Insert images into content
    return insertImagesIntoContent(content, imageUrls, title);

  } catch (error) {
    console.error('[TelegramImages] Error generating images:', error);
    return content; // Return original content on error
  }
}

/**
 * Generate N images from specified source
 */
async function generateImages(
  count: number,
  source: 'unsplash' | 'ai',
  title: string,
  excerpt: string,
  category: string
): Promise<string[]> {
  const sourcePlan = buildImageSourcePlan(count, source);
  const keywordPhrase = buildTitleKeywordPhrase(title, 5);
  const keywords = extractTitleKeywords(title, 5);

  console.log(
    `[TelegramImages] Generating ${count} images (requested source: ${source}, plan: ${sourcePlan.join(' + ')})...`
  );
  console.log(`[TelegramImages] Title keywords: ${keywordPhrase}`);

  // Create parallel requests according to source plan
  const requests = sourcePlan.map((apiSource, index) => {
    const keywordVariant = keywords[index % Math.max(1, keywords.length)] || keywordPhrase;
    const prompt =
      apiSource === 'dalle'
        ? `${keywordPhrase} ${keywordVariant} ${category} digital concept`
        : `${keywordPhrase} ${keywordVariant}`;

    return fetch(`${BASE_URL}/api/admin/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: apiSource,
        title: prompt,
        excerpt: excerpt || keywordPhrase,
        category: category
      }),
    });
  });

  // Wait for all requests (parallel)
  const responses = await Promise.all(requests);

  // Extract URLs
  const imageUrls: string[] = [];
  for (const response of responses) {
    if (response.ok) {
      const data = await response.json();
      if (data.url && data.url.length > 0) {
        imageUrls.push(data.url);
      }
    }
  }

  return imageUrls;
}

function buildImageSourcePlan(
  count: number,
  source: 'unsplash' | 'ai'
): Array<'unsplash' | 'dalle'> {
  if (count === 2) {
    // Fixed baseline: 1 stock + 1 generated for better variety.
    return ['unsplash', 'dalle'];
  }

  const apiSource = source === 'ai' ? 'dalle' : 'unsplash';
  return Array.from({ length: count }, () => apiSource);
}

/**
 * Insert images into content at strategic positions
 */
function insertImagesIntoContent(
  content: string,
  imageUrls: string[],
  title: string
): string {
  // Split content into paragraphs
  const paragraphs = content.split(/\n\n+/);
  
  if (paragraphs.length < 3) {
    // Not enough content, just append images at the end
    const imageMarkdown = imageUrls.map((url, i) => 
      `\n![${title} - Image ${i + 1}](${url})\n`
    ).join('\n');
    return content + imageMarkdown;
  }

  // Calculate positions based on number of images
  const positions = calculateImagePositions(paragraphs.length, imageUrls.length);

  console.log(`[TelegramImages] Inserting ${imageUrls.length} images at positions: ${positions.join(', ')}`);

  // Insert images at calculated positions (reverse order to preserve indices)
  positions.reverse().forEach((position, reverseIndex) => {
    const index = imageUrls.length - 1 - reverseIndex;
    const imageMarkdown = `\n![${title} - Image ${index + 1}](${imageUrls[index]})\n`;
    paragraphs.splice(position, 0, imageMarkdown);
  });

  return paragraphs.join('\n\n');
}

/**
 * Calculate optimal positions for images based on content length
 */
function calculateImagePositions(paragraphCount: number, imageCount: number): number[] {
  const positions: number[] = [];

  if (imageCount === 1) {
    // 1 image: at ~40% (after intro, before main content)
    positions.push(Math.floor(paragraphCount * 0.4));
  } else if (imageCount === 2) {
    // 2 images: at ~33% and ~66%
    positions.push(Math.floor(paragraphCount * 0.33));
    positions.push(Math.floor(paragraphCount * 0.66));
  } else if (imageCount === 3) {
    // 3 images: at ~25%, ~50%, ~75%
    positions.push(Math.floor(paragraphCount * 0.25));
    positions.push(Math.floor(paragraphCount * 0.50));
    positions.push(Math.floor(paragraphCount * 0.75));
  }

  return positions;
}
