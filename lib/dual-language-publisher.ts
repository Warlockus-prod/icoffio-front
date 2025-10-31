/**
 * DUAL-LANGUAGE ARTICLE PUBLISHER
 * 
 * Handles automatic publishing of articles in both EN and PL
 * with 2 images inserted into content
 * Includes AI category detection and title generation
 */

import { translateArticleContent } from './ai-copywriting-service';
import { detectCategory, generateOptimizedTitle } from './ai-category-detector';
import { getPublicationStyle, PublicationStyle } from './telegram-user-preferences';
import { getOrGenerateImage } from './telegram-image-service';

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
 * Get style parameters for article generation
 */
function getStyleParams(style: PublicationStyle): { targetWords: number; stylePrompt: string } {
  const styleConfig = {
    news: {
      targetWords: 400,
      stylePrompt: 'professional'
    },
    analytical: {
      targetWords: 1000,
      stylePrompt: 'professional'
    },
    tutorial: {
      targetWords: 750,
      stylePrompt: 'professional'
    },
    opinion: {
      targetWords: 600,
      stylePrompt: 'professional'
    }
  };
  
  return styleConfig[style] || styleConfig.analytical;
}

/**
 * Generate article in EN, translate to PL, publish both with images
 */
export async function publishDualLanguageArticle(
  prompt: string,
  userTitle: string | undefined,
  userCategory: string | undefined,
  chatId?: number
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

    // Get user's publication style if chatId provided
    let userStyle: PublicationStyle = 'analytical';
    let styleParams = getStyleParams(userStyle);
    
    if (chatId) {
      try {
        userStyle = await getPublicationStyle(chatId);
        styleParams = getStyleParams(userStyle);
        console.log(`[DualLang] Using user style: ${userStyle} (${styleParams.targetWords} words)`);
      } catch (error) {
        console.warn('[DualLang] Failed to get user style, using default:', error);
      }
    }

    // Step 1: Generate EN article
    console.log(`[DualLang] Generating EN article with style: ${userStyle}...`);
    
    const generateResponse = await fetch(`${BASE_URL}/api/admin/generate-article-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        title: finalTitle,
        category: finalCategory,
        language: 'en',
        targetWords: styleParams.targetWords,
        style: styleParams.stylePrompt
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
    console.log(`[DualLang] Generating 2 unique images with SMART AI prompts...`);

    // ✨ НОВАЯ СИСТЕМА: Используем умные промпты через GPT-4
    const { generateSmartImagePrompts } = await import('./smart-image-prompt-generator');
    
    let smartPrompts;
    try {
      smartPrompts = await generateSmartImagePrompts({
        title,
        content: content.substring(0, 1000), // Первые 1000 символов для анализа
        excerpt,
        category
      });
      
      console.log('[DualLang] ✅ Smart prompts generated:', {
        heroPrompt: smartPrompts.heroPrompt.substring(0, 50),
        contentPrompts: smartPrompts.contentPrompts.length,
        tags: smartPrompts.unsplashTags.length
      });
    } catch (error) {
      console.warn('[DualLang] Smart prompts failed, using fallback:', error);
      // Fallback если AI недоступен
      smartPrompts = {
        contentPrompts: [`${title} ${category}`, `${category} technology concept`],
        unsplashTags: [category, ...title.split(' ').slice(0, 3)]
      };
    }

    // Генерируем 2 изображения с переиспользованием из библиотеки
    const imagePrompts = [
      smartPrompts.contentPrompts[0] || title,
      smartPrompts.contentPrompts[1] || `${category} perspective`
    ];
    
    const images = await Promise.all(
      imagePrompts.map(async (prompt, index) => {
        return await getOrGenerateImage(
          prompt,
          category,
          async () => {
            // Generate new image function
            const response = await fetch(`${BASE_URL}/api/admin/generate-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source: 'unsplash',
                title: prompt,
                excerpt: index === 0 ? title : excerpt || title,
                category,
                unsplashTags: smartPrompts.unsplashTags?.slice(index * 3, (index + 1) * 6) || []
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              return data.url || '';
            }
            
            throw new Error(`Image generation failed: ${response.statusText}`);
          }
        );
      })
    );
    
    // Filter out empty strings
    const validImages = images.filter(url => url && url.length > 0);

    if (validImages.length === 0) {
      console.warn('[DualLang] No images generated');
      return content;
    }

    console.log(`[DualLang] Generated/reused ${validImages.length} images`);

    // Split content into paragraphs (by double newline)
    const paragraphs = content.split(/\n\n+/);
    
    if (paragraphs.length < 4) {
      // Not enough content, return as is
      return content;
    }

    // Insert first image after 30-40% of content (more text before image)
    const firstImagePosition = Math.floor(paragraphs.length * 0.35);
    paragraphs.splice(firstImagePosition, 0, `\n![${title}](${validImages[0]})\n`);

    // Insert second image after 70-80% of content (if we have second image)
    if (validImages[1]) {
      const secondImagePosition = Math.floor(paragraphs.length * 0.75);
      paragraphs.splice(secondImagePosition, 0, `\n![${title} illustration](${validImages[1]})\n`);
    }

    return paragraphs.join('\n\n');

  } catch (error) {
    console.error('[DualLang] Image insertion failed:', error);
    return content;
  }
}

