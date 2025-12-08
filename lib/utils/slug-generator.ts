/**
 * UNIFIED SLUG GENERATOR
 * 
 * Единая функция для генерации URL-friendly slugs
 * Используется везде в проекте для consistency
 * 
 * @version 8.6.2
 * @date 2025-12-08
 */

/**
 * Generate URL-friendly slug from title
 * 
 * @param title - Article title
 * @param language - Optional language suffix ('en' or 'pl')
 * @param maxLength - Maximum slug length (default: 60)
 * @returns URL-friendly slug
 * 
 * @example
 * generateSlug("My Article Title") → "my-article-title"
 * generateSlug("My Article Title", "en") → "my-article-title-en"
 * generateSlug("My Article Title", "pl") → "my-article-title-pl"
 */
export function generateSlug(
  title: string,
  language?: 'en' | 'pl',
  maxLength: number = 60
): string {
  if (!title || typeof title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  // 1. Convert to lowercase
  let slug = title.toLowerCase();

  // 2. Normalize unicode characters (handle accents, etc)
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Remove all non-alphanumeric characters except spaces and hyphens
  slug = slug.replace(/[^a-z0-9\s-]/g, '');

  // 4. Replace multiple spaces with single hyphen
  slug = slug.replace(/\s+/g, '-');

  // 5. Replace multiple hyphens with single hyphen
  slug = slug.replace(/-+/g, '-');

  // 6. Remove leading/trailing hyphens
  slug = slug.replace(/^-|-$/g, '');

  // 7. Trim to max length
  slug = slug.substring(0, maxLength);

  // 8. Remove trailing hyphen if trimming created one
  slug = slug.replace(/-$/g, '');

  // 9. Add language suffix if provided
  if (language) {
    // Ensure we have room for suffix
    const suffixLength = language.length + 1; // "-en" or "-pl"
    if (slug.length + suffixLength > maxLength) {
      slug = slug.substring(0, maxLength - suffixLength);
      slug = slug.replace(/-$/g, ''); // Remove trailing hyphen after trim
    }
    slug += `-${language}`;
  }

  // 10. Fallback if slug is empty
  if (!slug) {
    slug = 'article';
    if (language) slug += `-${language}`;
  }

  return slug;
}

/**
 * Generate unique slug by adding timestamp if needed
 * 
 * @param title - Article title
 * @param language - Optional language suffix
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 */
export function generateUniqueSlug(
  title: string,
  language?: 'en' | 'pl',
  existingSlugs: string[] = []
): string {
  let slug = generateSlug(title, language);
  
  // If slug exists, add timestamp
  if (existingSlugs.includes(slug)) {
    const timestamp = Date.now().toString().slice(-6);
    const maxLength = 60 - timestamp.length - 1; // -1 for hyphen
    slug = generateSlug(title, language, maxLength) + `-${timestamp}`;
  }
  
  return slug;
}

/**
 * Validate slug format
 * 
 * @param slug - Slug to validate
 * @returns true if valid
 */
export function isValidSlug(slug: string): boolean {
  // Valid slug: lowercase, alphanumeric, hyphens only
  // Must not start/end with hyphen
  // Must have at least one character
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Extract language from slug
 * 
 * @param slug - Slug with language suffix
 * @returns Language code or null
 * 
 * @example
 * extractLanguageFromSlug("my-article-en") → "en"
 * extractLanguageFromSlug("my-article-pl") → "pl"
 * extractLanguageFromSlug("my-article") → null
 */
export function extractLanguageFromSlug(slug: string): 'en' | 'pl' | null {
  if (slug.endsWith('-en')) return 'en';
  if (slug.endsWith('-pl')) return 'pl';
  return null;
}

/**
 * Remove language suffix from slug
 * 
 * @param slug - Slug with language suffix
 * @returns Slug without language suffix
 * 
 * @example
 * removeLanguageSuffix("my-article-en") → "my-article"
 * removeLanguageSuffix("my-article-pl") → "my-article"
 * removeLanguageSuffix("my-article") → "my-article"
 */
export function removeLanguageSuffix(slug: string): string {
  return slug.replace(/-(en|pl)$/, '');
}

