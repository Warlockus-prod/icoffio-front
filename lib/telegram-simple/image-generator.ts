/**
 * TELEGRAM IMAGE GENERATOR v8.5.1
 * 
 * Generates and inserts images into article content
 * Based on user settings (count, source)
 */

import { buildImageKeywordPhrase, extractImageKeywords } from '../image-keywords';
import { buildInternalServiceHeaders } from '../internal-service-auth';
import { getSiteBaseUrl } from '../site-url';

function isRenderableImageUrl(url: string): boolean {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  if (/\/photo-1(?:[/?]|$)/i.test(normalized)) return false;
  if (/\/(?:undefined|null|nan)(?:[/?]|$)/i.test(normalized)) return false;
  return true;
}

export interface ImageGenerationOptions {
  imagesCount: number; // 0-3
  imagesSource: 'unsplash' | 'ai' | 'none';
  title: string;
  excerpt: string;
  category: string;
  /** GPT-optimized Unsplash search phrase (from content-processor) */
  imageSearchQuery?: string;
  /** GPT-optimized DALL-E prompt (from content-processor) */
  imagePrompt?: string;
}

const IMAGE_REQUEST_RETRIES = 2;
const RETRY_DELAY_MS = 600;

/**
 * Generate images and insert them into content
 */
export async function insertImages(
  content: string,
  options: ImageGenerationOptions
): Promise<string> {
  const { imagesCount, imagesSource, title, excerpt, category, imageSearchQuery, imagePrompt } = options;

  console.log(`[TelegramImages] Inserting ${imagesCount} images from ${imagesSource}...`);
  if (imageSearchQuery) console.log(`[TelegramImages] 🧠 GPT search query: ${imageSearchQuery}`);
  if (imagePrompt) console.log(`[TelegramImages] 🧠 GPT DALL-E prompt: ${imagePrompt?.substring(0, 80)}...`);

  // No images requested
  if (imagesCount === 0 || imagesSource === 'none') {
    console.log('[TelegramImages] No images requested');
    return content;
  }

  try {
    // Generate images in parallel
    const imageUrls = await generateImages(imagesCount, imagesSource, title, excerpt, category, imageSearchQuery, imagePrompt);

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
  category: string,
  gptSearchQuery?: string,
  gptImagePrompt?: string
): Promise<string[]> {
  const sourcePlan = buildImageSourcePlan(count, source);
  const keywordPhrase = gptSearchQuery || buildImageKeywordPhrase({ title, excerpt, category }, 6);
  const keywords = extractImageKeywords({ title, excerpt, category }, 8);

  console.log(
    `[TelegramImages] Generating ${count} images (requested source: ${source}, plan: ${sourcePlan.join(' + ')})...`
  );
  console.log(`[TelegramImages] Search phrase: ${keywordPhrase}${gptSearchQuery ? ' (GPT)' : ' (title)'}`);

  const generated = await Promise.all(
    sourcePlan.map(async (apiSource, index) => {
      const keywordVariant = keywords[index % Math.max(1, keywords.length)] || keywordPhrase;
      const payload = buildImageRequestPayload({
        apiSource,
        title,
        keywordPhrase,
        keywordVariant,
        excerpt,
        category,
        imageIndex: index,
        gptImagePrompt: index === 0 ? gptImagePrompt : undefined,
      });

      const url = await requestImageWithRetries(payload, IMAGE_REQUEST_RETRIES);
      if (url) return url;

      // Hard fallback: if DALL-E failed, fill missing slot from Unsplash.
      if (apiSource === 'dalle') {
        const fallbackPayload = buildImageRequestPayload({
          apiSource: 'unsplash',
          title,
          keywordPhrase,
          keywordVariant,
          excerpt,
          category,
          imageIndex: index,
        });
        return requestImageWithRetries(fallbackPayload, 1);
      }

      return null;
    })
  );

  const imageUrls = Array.from(
    new Set(generated.filter((url): url is string => Boolean(url && isRenderableImageUrl(url))))
  );

  // Final fill to reach requested count.
  if (imageUrls.length < count) {
    for (let index = imageUrls.length; index < count; index++) {
      const keywordVariant = keywords[index % Math.max(1, keywords.length)] || keywordPhrase;
      const fallbackPayload = buildImageRequestPayload({
        apiSource: 'unsplash',
        title,
        keywordPhrase,
        keywordVariant,
        excerpt,
        category,
        imageIndex: index,
      });
      const fallbackUrl = await requestImageWithRetries(fallbackPayload, 1);
      if (fallbackUrl && isRenderableImageUrl(fallbackUrl)) {
        imageUrls.push(fallbackUrl);
      }
    }
  }

  return imageUrls.slice(0, count);
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

type ImageApiSource = 'unsplash' | 'dalle';

interface ImageRequestPayload {
  source: ImageApiSource;
  title: string;
  excerpt: string;
  category: string;
}

function buildImageRequestPayload(input: {
  apiSource: ImageApiSource;
  title: string;
  keywordPhrase: string;
  keywordVariant: string;
  excerpt: string;
  category: string;
  imageIndex: number;
  gptImagePrompt?: string;
}): ImageRequestPayload {
  const { apiSource, title, keywordPhrase, keywordVariant, excerpt, category, imageIndex, gptImagePrompt } = input;

  if (apiSource === 'dalle') {
    // DALL-E path: prefer GPT-optimized prompt, fallback to title + keywords.
    return {
      source: 'dalle',
      title: gptImagePrompt || `${title} ${keywordVariant}`.trim(),
      excerpt: excerpt || keywordPhrase,
      category,
    };
  }

  // Unsplash path: compact search query from keywords (keywordPhrase already uses GPT query if available).
  const query = [keywordPhrase, keywordVariant, category].filter(Boolean).join(' ').trim();
  return {
    source: 'unsplash',
    title: query || `${title} ${imageIndex + 1}`.trim(),
    excerpt: excerpt || keywordPhrase,
    category,
  };
}

async function requestImageWithRetries(
  payload: ImageRequestPayload,
  maxAttempts: number
): Promise<string | null> {
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    try {
      const response = await fetch(`${getSiteBaseUrl()}/api/admin/generate-image`, {
        method: 'POST',
        headers: buildInternalServiceHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (isRenderableImageUrl(data.url)) {
          return data.url as string;
        }
      } else {
        const body = await response.text().catch(() => '');
        console.warn(
          `[TelegramImages] ${payload.source} generation failed (attempt ${attempt}/${maxAttempts}): ${response.status} ${body.slice(0, 180)}`
        );
      }
    } catch (error) {
      console.warn(
        `[TelegramImages] ${payload.source} request error (attempt ${attempt}/${maxAttempts}):`,
        error
      );
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  return null;
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
