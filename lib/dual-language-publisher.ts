/**
 * DUAL-LANGUAGE ARTICLE PUBLISHER
 * 
 * Handles automatic publishing of articles in both EN and PL
 * with 2 images inserted into content
 * Includes AI category detection and title generation
 */

import { translateArticleContent } from './ai-copywriting-service';
import { detectCategory, generateOptimizedTitle } from './ai-category-detector';

const BASE_URL = 'https://app.icoffio.com';

export interface DualLanguagePublishResult {
  success: boolean;
  enResult: {
    title: string;
    url: string | null;
    postId: number | null;
    wordCount: number;
  };
  plResult: {
    title: string;
    url: string | null;
    postId: number | null;
  } | null;
  category: string;
  error?: string;
}

/**
 * Generate article in EN, translate to PL, publish both with images
 */
export async function publishDualLanguageArticle(
  prompt: string,
  userTitle: string | undefined,
  userCategory: string | undefined
): Promise<DualLanguagePublishResult> {
  try {
    // Step 0: AI Category Detection and Title Generation
    console.log(`[DualLang] AI detecting category...`);
    const categoryResult = await detectCategory(prompt, userTitle);
    const detectedCategory = categoryResult.category;
    console.log(`[DualLang] Detected category: ${detectedCategory} (confidence: ${categoryResult.confidence})`);

    // Generate SEO-optimized title
    console.log(`[DualLang] AI generating title...`);
    const optimizedTitle = await generateOptimizedTitle(prompt, detectedCategory);
    console.log(`[DualLang] Generated title: "${optimizedTitle}"`);

    // Use AI-generated or user-provided values
    const finalTitle = userTitle || optimizedTitle;
    const finalCategory = userCategory || detectedCategory;

    // Step 1: Generate EN article
    console.log(`[DualLang] Generating EN article...`);
    
    const generateResponse = await fetch(`${BASE_URL}/api/admin/generate-article-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        title: finalTitle,
        category: finalCategory,
        language: 'en',
        targetWords: 600,
        style: 'professional'
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`EN generation failed: ${await generateResponse.text()}`);
    }

    const enContent = await generateResponse.json();
    console.log(`[DualLang] EN generated: "${enContent.title}" (${enContent.wordCount} words)`);

    // Step 2: Insert 2 images into EN content
    const enContentWithImages = await insertImagesIntoContent(
      enContent.content,
      enContent.title,
      enContent.excerpt,
      finalCategory
    );

    // Step 3: Translate to PL
    console.log(`[DualLang] Translating to PL...`);
    
    const plTranslation = await translateArticleContent(
      enContentWithImages, // Translate content WITH images
      'en',
      'pl',
      enContent.title
    );

    // Step 4: Publish EN version
    console.log(`[DualLang] Publishing EN...`);
    
    const enPublishResponse = await fetch(`${BASE_URL}/api/admin/publish-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: enContent.title,
        content: enContentWithImages,
        excerpt: enContent.excerpt,
        category: finalCategory,
        language: 'en',
        author: 'Telegram Bot',
        source: 'telegram-bot'
      }),
    });

    if (!enPublishResponse.ok) {
      throw new Error(`EN publication failed: ${await enPublishResponse.text()}`);
    }

    const enPublishResult = await enPublishResponse.json();
    console.log(`[DualLang] EN published: ${enPublishResult.url}`);

    // Step 5: Publish PL version
    let plPublishResult = null;
    
    if (plTranslation.success) {
      console.log(`[DualLang] Publishing PL...`);
      
      const plPublishResponse = await fetch(`${BASE_URL}/api/admin/publish-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: plTranslation.translatedTitle,
          content: plTranslation.translatedContent,
          excerpt: plTranslation.translatedContent.substring(0, 160).replace(/[#*]/g, ''),
          category: finalCategory,
          language: 'pl',
          author: 'Telegram Bot',
          source: 'telegram-bot'
        }),
      });

      if (plPublishResponse.ok) {
        plPublishResult = await plPublishResponse.json();
        console.log(`[DualLang] PL published: ${plPublishResult.url}`);
      } else {
        console.warn(`[DualLang] PL publication failed, continuing with EN only`);
      }
    } else {
      console.warn(`[DualLang] PL translation failed, publishing EN only`);
    }

    return {
      success: true,
      enResult: {
        title: enContent.title,
        url: enPublishResult.url || null,
        postId: enPublishResult.postId || null,
        wordCount: enContent.wordCount
      },
      plResult: plPublishResult ? {
        title: plTranslation.translatedTitle,
        url: plPublishResult.url || null,
        postId: plPublishResult.postId || null
      } : null,
      category: finalCategory
    };

  } catch (error: any) {
    console.error('[DualLang] Error:', error);
    return {
      success: false,
      enResult: {
        title: '',
        url: null,
        postId: null,
        wordCount: 0
      },
      plResult: null,
      category: 'Technology', // Default on error
      error: error.message
    };
  }
}

/**
 * Insert 2 images into article content (beginning + middle)
 */
async function insertImagesIntoContent(
  content: string,
  title: string,
  excerpt: string,
  category: string
): Promise<string> {
  try {
    console.log(`[DualLang] Generating 2 images...`);

    // Generate 2 different images
    const [image1Response, image2Response] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'unsplash',
          title,
          excerpt,
          category
        }),
      }),
      fetch(`${BASE_URL}/api/admin/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'unsplash',
          title: `${title} - detailed view`,
          excerpt,
          category
        }),
      })
    ]);

    const images = [];
    
    if (image1Response.ok) {
      const data = await image1Response.json();
      if (data.url) images.push(data.url);
    }

    if (image2Response.ok) {
      const data = await image2Response.json();
      if (data.url) images.push(data.url);
    }

    if (images.length === 0) {
      console.warn('[DualLang] No images generated');
      return content;
    }

    console.log(`[DualLang] Generated ${images.length} images`);

    // Split content by major headings (##)
    const sections = content.split(/(?=^##\s)/m);

    // Insert first image after intro (before first ##)
    if (images[0] && sections.length > 0) {
      sections[0] += `\n\n![${title}](${images[0]})\n\n`;
    }

    // Insert second image in the middle
    if (images[1] && sections.length > 3) {
      const middleIndex = Math.floor(sections.length / 2);
      sections[middleIndex] += `\n\n![${title} - illustration](${images[1]})\n\n`;
    } else if (images[1] && sections.length > 1) {
      // If not enough sections, add to end
      sections[sections.length - 1] += `\n\n![${title} - illustration](${images[1]})\n\n`;
    }

    return sections.join('');

  } catch (error) {
    console.error('[DualLang] Image insertion failed:', error);
    return content;
  }
}

