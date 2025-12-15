/**
 * TELEGRAM IMAGE SERVICE
 * 
 * Manages image library for reuse across similar articles
 * Finds similar images by keywords and category
 * Saves new images to library
 * 
 * @version 7.13.0
 * @date 2025-10-31
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ImageLibraryEntry {
  id?: number;
  image_url: string;
  thumbnail_url?: string;
  prompt: string;
  category?: string;
  keywords: string[];
  usage_count: number;
  last_used_at?: string;
}

// Lazy initialization для Supabase
let supabaseClient: SupabaseClient | null = null;
let supabaseAvailable: boolean = true;

function getSupabase(): SupabaseClient | null {
  if (!supabaseAvailable) return null;
  
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[ImageLibrary] Supabase not configured, image reuse disabled');
      supabaseAvailable = false;
      return null;
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      console.log('[ImageLibrary] Supabase client initialized');
    } catch (error) {
      console.error('[ImageLibrary] Failed to initialize Supabase:', error);
      supabaseAvailable = false;
      return null;
    }
  }
  
  return supabaseClient;
}

/**
 * Extract keywords from text for image search
 */
function extractKeywords(text: string, category?: string): string[] {
  const keywords: string[] = [];
  
  // Add category if provided
  if (category) {
    keywords.push(category.toLowerCase());
  }
  
  // Extract main words from text (3-10 characters, not common words)
  const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'way', 'use', 'she', 'her', 'him', 'his']);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && word.length <= 10 && !commonWords.has(word));
  
  // Get top 10 unique words
  const uniqueWords = [...new Set(words)].slice(0, 10);
  keywords.push(...uniqueWords);
  
  return keywords.slice(0, 15); // Max 15 keywords
}

/**
 * Find similar image in library by keywords and category
 */
export async function findSimilarImage(
  title: string,
  category?: string,
  minSimilarity: number = 2
): Promise<ImageLibraryEntry | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  
  try {
    const keywords = extractKeywords(title, category);
    
    if (keywords.length < minSimilarity) {
      console.log('[ImageLibrary] Not enough keywords for search');
      return null;
    }
    
    console.log(`[ImageLibrary] Searching for similar image with keywords: ${keywords.slice(0, 5).join(', ')}...`);
    
    // Search for images with matching keywords
    const { data, error } = await supabase
      .from('telegram_image_library')
      .select('*')
      .overlaps('keywords', keywords) // Check if arrays overlap
      .order('usage_count', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(1);
    
    if (error) {
      console.error('[ImageLibrary] Search error:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const match = data[0] as ImageLibraryEntry;
      console.log(`[ImageLibrary] ✅ Found similar image: ${match.id} (usage: ${match.usage_count})`);
      return match;
    }
    
    console.log('[ImageLibrary] No similar image found');
    return null;
    
  } catch (error) {
    console.error('[ImageLibrary] Exception finding similar image:', error);
    return null;
  }
}

/**
 * Save image to library
 */
export async function saveToLibrary(
  imageUrl: string,
  prompt: string,
  category?: string,
  thumbnailUrl?: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[ImageLibrary] Cannot save - Supabase not available');
    return false;
  }
  
  try {
    const keywords = extractKeywords(prompt, category);
    
    const { error } = await supabase
      .from('telegram_image_library')
      .insert({
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl || null,
        prompt,
        category: category || null,
        keywords,
        usage_count: 0,
        last_used_at: null,
      });
    
    if (error) {
      console.error('[ImageLibrary] Save error:', error);
      return false;
    }
    
    console.log(`[ImageLibrary] ✅ Saved image to library (keywords: ${keywords.slice(0, 3).join(', ')})`);
    return true;
    
  } catch (error) {
    console.error('[ImageLibrary] Exception saving image:', error);
    return false;
  }
}

/**
 * Increment usage count for image
 */
export async function incrementUsageCount(imageId: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  
  try {
    // Get current count first
    const { data: current } = await supabase
      .from('telegram_image_library')
      .select('usage_count')
      .eq('id', imageId)
      .single();
    
    if (current) {
      await supabase
        .from('telegram_image_library')
        .update({
          usage_count: (current.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', imageId);
      
      console.log(`[ImageLibrary] ✅ Incremented usage count for image ${imageId}`);
    }
  } catch (error) {
    console.error('[ImageLibrary] Exception incrementing usage:', error);
  }
}

/**
 * Get or generate image (with reuse)
 */
export async function getOrGenerateImage(
  title: string,
  category: string,
  generateImageFn: () => Promise<string>
): Promise<string> {
  // Try to find similar image first
  const similar = await findSimilarImage(title, category);
  
  if (similar && similar.image_url) {
    // Increment usage count
    if (similar.id) {
      await incrementUsageCount(similar.id);
    }
    
    console.log(`[ImageLibrary] ♻️ Reusing existing image: ${similar.image_url.substring(0, 50)}...`);
    return similar.image_url;
  }
  
  // Generate new image
  console.log(`[ImageLibrary] 🆕 Generating new image...`);
  const newImageUrl = await generateImageFn();
  
  // Save to library for future reuse
  await saveToLibrary(newImageUrl, title, category);
  
  return newImageUrl;
}

