/**
 * TELEGRAM IMAGE GENERATOR v8.5.1
 * 
 * Generates and inserts images into article content
 * Based on user settings (count, source)
 */

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
      console.warn(`[TelegramImages] ⚠️ No images generated (requested ${imagesCount} from ${imagesSource}), returning original content`);
      console.warn('[TelegramImages] This may indicate API configuration issue or rate limiting');
      return content;
    }

    console.log(`[TelegramImages] ✅ Generated ${imageUrls.length}/${imagesCount} images successfully`);

    // Insert images into content
    const contentWithImages = insertImagesIntoContent(content, imageUrls, title);
    
    if (contentWithImages === content) {
      console.warn('[TelegramImages] ⚠️ Content unchanged after image insertion');
    }
    
    return contentWithImages;

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
  console.log(`[TelegramImages] Generating ${count} images from ${source}...`);

  // ✅ FIX: Map Telegram settings source to API source
  // Telegram uses: 'unsplash' | 'ai' | 'none'
  // API expects: 'unsplash' | 'dalle' | 'custom'
  const apiSource = source === 'ai' ? 'dalle' : source;

  // Create N parallel requests
  const requests = Array.from({ length: count }, (_, index) => {
    // Vary the prompt slightly for each image to get different results
    const prompt = index === 0 
      ? title 
      : `${category} technology concept ${index + 1}`;

    return fetch(`${BASE_URL}/api/admin/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: apiSource, // ✅ FIX: Use mapped source ('dalle' instead of 'ai')
        title: prompt,
        excerpt: excerpt || title,
        category: category
      }),
    });
  });

  // Wait for all requests (parallel)
  const responses = await Promise.all(requests);

  // Extract URLs
  const imageUrls: string[] = [];
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (response.ok) {
      const data = await response.json();
      console.log(`[TelegramImages] Image ${i + 1} response:`, {
        success: data.success,
        url: data.url?.substring(0, 50) + '...',
        source: data.source,
        error: data.error,
      });
      
      // ✅ FIX: Check both success flag and url presence
      if (data.success && data.url && data.url.length > 0) {
        imageUrls.push(data.url);
        console.log(`[TelegramImages] ✅ Image ${i + 1} added: ${data.url.substring(0, 60)}...`);
      } else {
        console.error(`[TelegramImages] ❌ Image ${i + 1} failed:`, {
          success: data.success,
          error: data.error,
          hasUrl: !!data.url,
        });
      }
    } else {
      const errorText = await response.text();
      console.error(`[TelegramImages] ❌ Image ${i + 1} HTTP error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 200),
      });
    }
  }

  console.log(`[TelegramImages] ✅ Generated ${imageUrls.length}/${count} images`);
  return imageUrls;
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

