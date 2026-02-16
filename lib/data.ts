import type { Post, Category } from "./types";
import { getLocalArticles as getLocalArticlesFromFile, getLocalArticleBySlug as getLocalArticleBySlugFromFile } from "./local-articles";
import { getSupabaseClient, isSupabaseConfigured } from './supabase-client';
import { sanitizeExcerptText, sanitizeArticleBodyText, normalizeAiGeneratedText } from './utils/content-formatter';

// Re-export from local-articles.ts
const getLocalArticles = getLocalArticlesFromFile;
const getLocalArticleBySlug = getLocalArticleBySlugFromFile;

/**
 * Normalize category from API response.
 * API may return a string or a Category object — always return Category.
 */
function normalizeCategory(raw: unknown): Category {
  if (raw && typeof raw === 'object' && 'slug' in raw) {
    return raw as Category;
  }
  if (typeof raw === 'string' && raw.trim()) {
    return { name: raw, slug: raw.toLowerCase().replace(/\s+/g, '-') };
  }
  return { name: "General", slug: "general" };
}

function toValidCategory(raw: unknown): Category | null {
  const normalized = normalizeCategory(raw);
  const slug = (normalized.slug || '').trim();
  if (!slug || slug === 'general') return null;
  return {
    name: (normalized.name || slug).trim(),
    slug,
  };
}

// ========== SUPABASE DIRECT HELPERS ==========
// These replace the previous self-fetch approach (fetch to own /api/supabase-articles)
// which caused 500 errors during RSC rendering on Vercel (serverless deadlock).

const DEFAULT_THUMBNAIL_MARKER = 'photo-1485827404703-89b55fcc595e';

function hasCustomImage(imageUrl?: string | null): boolean {
  return !!imageUrl && !imageUrl.includes(DEFAULT_THUMBNAIL_MARKER);
}

function articleTimestamp(article: any): number {
  const value = article?.updated_at || article?.created_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function scoreArticle(article: any, language: 'en' | 'pl'): number {
  const content = language === 'pl' ? article?.content_pl : article?.content_en;
  const excerpt = language === 'pl' ? article?.excerpt_pl : article?.excerpt_en;
  const contentLength = typeof content === 'string' ? content.length : 0;

  let score = 0;
  if (hasCustomImage(article?.image_url)) score += 100;
  if (contentLength > 0) score += Math.min(contentLength, 5000) / 50;
  if (typeof excerpt === 'string' && excerpt.trim().length > 0) score += 10;
  if (article?.featured) score += 2;
  return score;
}

function selectBestArticleVersion(articles: any[], language: 'en' | 'pl'): any | null {
  if (!articles || articles.length === 0) return null;

  return articles.reduce((best: any, candidate: any) => {
    if (!best) return candidate;

    const bestScore = scoreArticle(best, language);
    const candidateScore = scoreArticle(candidate, language);

    if (candidateScore > bestScore) return candidate;
    if (candidateScore < bestScore) return best;

    return articleTimestamp(candidate) > articleTimestamp(best) ? candidate : best;
  }, null);
}

function dedupeArticlesBySlug(articles: any[], language: 'en' | 'pl'): any[] {
  const groupedBySlug = new Map<string, any[]>();

  for (const article of articles || []) {
    const slugKey = language === 'en' ? article?.slug_en : article?.slug_pl;
    if (!slugKey) continue;

    const existingGroup = groupedBySlug.get(slugKey) || [];
    existingGroup.push(article);
    groupedBySlug.set(slugKey, existingGroup);
  }

  return Array.from(groupedBySlug.values())
    .map(group => selectBestArticleVersion(group, language))
    .filter(Boolean) as any[];
}

function prepareArticleContentForFrontend(content: string, language: 'en' | 'pl'): string {
  const sanitized = sanitizeArticleBodyText(content || '', {
    language,
    aggressive: true,
  });
  return sanitized || normalizeAiGeneratedText(content || '');
}

/** Transform a raw Supabase row into a Post for list views */
function transformSupabaseArticleToPost(article: any, isEn: boolean): Post {
  const slug = isEn ? article.slug_en : article.slug_pl;
  const content = isEn ? article.content_en : article.content_pl;
  const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;
  const languageKey: 'en' | 'pl' = isEn ? 'en' : 'pl';

  return {
    slug: slug,
    title: article.title || "Untitled",
    excerpt: sanitizeExcerptText(excerpt || article.title || '', 200),
    date: article.created_at,
    publishedAt: article.created_at,
    image: article.image_url || '',
    category: normalizeCategory(article.category),
    contentHtml: prepareArticleContentForFrontend(content || '', languageKey),
    content: prepareArticleContentForFrontend(content || '', languageKey),
    tags: Array.isArray(article.tags)
      ? article.tags.map((tag: string) => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') }))
      : []
  };
}

// Детектирование кириллицы в тексте
function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

// Детектирование польского языка
function hasPolish(text: string): boolean {
  // Специфичные польские символы
  return /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text);
}

/**
 * Filter articles by locale using slug suffix and content analysis.
 * Supported locales: 'en', 'pl'.
 */
function filterArticlesByLanguage(articles: Post[], locale: string): Post[] {
  if (!['en', 'pl'].includes(locale)) {
    return [];
  }

  return articles.filter(article => {
    const slugContainsLocale = article.slug.includes(`-${locale}`);
    const contentToCheck = `${article.title} ${article.excerpt || ''} ${article.content || ''}`;

    if (locale === 'en') {
      // Exclude articles with Cyrillic or Polish-specific characters
      if (hasCyrillic(contentToCheck) || hasPolish(contentToCheck)) return false;
      return slugContainsLocale || (!hasCyrillic(contentToCheck) && !hasPolish(contentToCheck));
    }

    if (locale === 'pl') {
      // Require -pl in slug and exclude Cyrillic
      if (hasCyrillic(contentToCheck)) return false;
      return slugContainsLocale;
    }

    return false;
  });
}

export async function getAllPosts(limit = 12, locale = 'en'): Promise<Post[]> {
  // PRIORITY: Check runtime articles first (freshly created)
  const localArticles = await getLocalArticles();
  const runtimeFiltered = filterArticlesByLanguage(localArticles, locale);

  if (runtimeFiltered.length > 0) {
    console.log(`[data] Found ${runtimeFiltered.length} local/runtime articles for ${locale}`);
  }

  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const supabase = getSupabaseClient();
    const isEn = locale === 'en';

    let query = supabase
      .from('published_articles')
      .select('*')
      .eq('published', true);

    if (isEn) {
      query = query.not('content_en', 'is', null);
    } else {
      query = query.not('content_pl', 'is', null);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data: articles, error } = await query;

    if (error) throw new Error(`Supabase query failed: ${error.message}`);

    const uniqueArticles = dedupeArticlesBySlug(articles || [], isEn ? 'en' : 'pl');

    const dbPosts: Post[] = uniqueArticles.map((article: any) =>
      transformSupabaseArticleToPost(article, isEn)
    );

    // Runtime articles FIRST, then Supabase articles
    const combined = [...runtimeFiltered, ...dbPosts];

    // Dedupe by slug (runtime takes priority)
    const unique = combined.filter((article, index, self) =>
      index === self.findIndex((a) => a.slug === article.slug)
    );

    return unique.slice(0, limit);
  } catch (error) {
    console.warn('[data] Supabase query failed, using local only:', error);
    return runtimeFiltered.slice(0, limit);
  }
}

export async function getTopPosts(limit = 1) { return getAllPosts(limit); }

export async function getAllSlugs(): Promise<string[]> {
  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const supabase = getSupabaseClient();

    const { data: articles, error } = await supabase
      .from('published_articles')
      .select('slug_en, slug_pl')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(400);

    if (error) throw new Error(`Supabase query failed: ${error.message}`);

    const allSlugs: string[] = [];
    for (const article of articles || []) {
      if (article.slug_en) allSlugs.push(article.slug_en);
      if (article.slug_pl) allSlugs.push(article.slug_pl);
    }

    if (allSlugs.length > 0) {
      const localArticles = await getLocalArticles();
      const localSlugs = localArticles.map(article => article.slug);
      return [...new Set([...allSlugs, ...localSlugs])];
    }
  } catch (error) {
    console.warn('[data] Supabase unavailable for getAllSlugs:', error);
  }

  const localArticles = await getLocalArticles();
  return localArticles.map(article => article.slug);
}

export async function getPostBySlug(slug: string, locale: string = 'en'): Promise<Post|null> {
  // Check local articles first
  const localArticle = await getLocalArticleBySlug(slug);
  if (localArticle) {
    return localArticle;
  }

  // Direct Supabase query (no self-fetch)
  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const supabase = getSupabaseClient();

    const { data: articles, error } = await supabase
      .from('published_articles')
      .select('*')
      .or(`slug_en.eq.${slug},slug_pl.eq.${slug}`)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(20);

    const articleLanguage = slug?.endsWith('-pl') || locale === 'pl' ? 'pl' : 'en';
    const article = selectBestArticleVersion(articles || [], articleLanguage);

    if (error || !article) return null;

    const isEn = locale === 'en' || article.slug_en === slug;

    // Extract Polish title from content/excerpt
    let plTitle = article.title;
    let plContent = article.content_pl || '';
    const cleanedPlExcerpt = sanitizeExcerptText(article.excerpt_pl || '', 220).replace(/[.]{3,}\s*$/, '');

    if (!isEn && article.content_pl) {
      const headingMatch = article.content_pl.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        plTitle = headingMatch[1];
      } else if (cleanedPlExcerpt && cleanedPlExcerpt.length <= 140) {
        plTitle = cleanedPlExcerpt;
      }
    }

    // Remove first # heading from Polish content (to avoid duplication)
    if (!isEn && plContent) {
      plContent = plContent.replace(/^#\s+.+\n\n?/m, '');
    }

    const languageKey: 'en' | 'pl' = isEn ? 'en' : 'pl';
    const rawContent = isEn ? article.content_en || '' : plContent || '';

    return {
      slug: isEn ? article.slug_en : article.slug_pl,
      title: isEn ? article.title : plTitle,
      excerpt: sanitizeExcerptText(isEn ? article.excerpt_en : article.excerpt_pl, 200),
      date: article.created_at,
      publishedAt: article.created_at,
      image: article.image_url || "",
      category: normalizeCategory(article.category),
      contentHtml: prepareArticleContentForFrontend(rawContent, languageKey),
      content: prepareArticleContentForFrontend(rawContent, languageKey),
      tags: Array.isArray(article.tags)
        ? article.tags.map((tag: string) => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') }))
        : []
    };
  } catch (error) {
    console.warn('[data] Supabase unavailable for getPostBySlug:', error);
  }

  return null;
}

export async function getRelated(cat: Category, excludeSlug: string, limit = 4): Promise<Post[]> {
  const locale = excludeSlug.endsWith('-pl') ? 'pl' : 'en';
  const isEn = locale === 'en';
  const targetCategorySlug = (cat?.slug || '').trim();

  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const supabase = getSupabaseClient();

    const { data: articles, error } = await supabase
      .from('published_articles')
      .select('*')
      .eq('published', true)
      .not(isEn ? 'slug_en' : 'slug_pl', 'eq', excludeSlug)
      .order('created_at', { ascending: false })
      .limit(240);

    if (error) throw new Error(`Supabase related query failed: ${error.message}`);

    const uniqueArticles = dedupeArticlesBySlug(articles || [], isEn ? 'en' : 'pl');
    const sameCategory = targetCategorySlug
      ? uniqueArticles.filter((article: any) => normalizeCategory(article.category).slug === targetCategorySlug)
      : [];
    const sourceArticles = sameCategory.length > 0 ? sameCategory : uniqueArticles;

    return sourceArticles.slice(0, limit).map((article: any) => {
      const slug = isEn ? article.slug_en : article.slug_pl;
      const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;
      return {
        slug: slug,
        title: article.title,
        excerpt: sanitizeExcerptText(excerpt || '', 200),
        date: article.created_at,
        publishedAt: article.created_at,
        image: article.image_url || "",
        category: normalizeCategory(article.category) || cat,
        contentHtml: "",
      } as Post;
    });
  } catch (error) {
    console.warn('[data] Supabase unavailable for getRelated:', error);
  }

  // Fallback to local articles
  const localArticles = await getLocalArticles();
  return localArticles
    .filter(article => article.category.slug === cat.slug && article.slug !== excludeSlug)
    .slice(0, limit);
}

// Local categories for English and Polish
const getLocalCategories = (locale: string): Category[] => {
  switch (locale) {
    case 'en':
      return [
        { name: "Artificial Intelligence", slug: "ai" },
        { name: "Apple", slug: "apple" },
        { name: "Technology", slug: "tech" },
        { name: "Games", slug: "games" },
        { name: "Digital", slug: "digital" },
        { name: "News", slug: "news-2" }
      ];
    case 'pl':
      return [
        { name: "Sztuczna Inteligencja", slug: "ai" },
        { name: "Apple", slug: "apple" },
        { name: "Technologie", slug: "tech" },
        { name: "Gry", slug: "games" },
        { name: "Digital", slug: "digital" },
        { name: "Wiadomości", slug: "news-2" }
      ];
    default:
      console.warn(`Unsupported locale: ${locale}. Returning English categories.`);
      return [
        { name: "Artificial Intelligence", slug: "ai" },
        { name: "Apple", slug: "apple" },
        { name: "Technology", slug: "tech" },
        { name: "Games", slug: "games" },
        { name: "Digital", slug: "digital" },
        { name: "News", slug: "news-2" }
      ];
  }
};

export async function getCategories(locale: string = 'en'): Promise<Category[]> {
  const localCategories = getLocalCategories(locale);
  const categoriesMap = new Map<string, Category>(
    localCategories.map((category) => [category.slug, category])
  );

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('published_articles')
        .select('category')
        .eq('published', true)
        .not('category', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1200);

      if (error) {
        throw new Error(`Supabase category query failed: ${error.message}`);
      }

      for (const row of data || []) {
        const category = toValidCategory(row.category);
        if (!category || categoriesMap.has(category.slug)) continue;
        categoriesMap.set(category.slug, category);
      }
    }
  } catch (error) {
    console.warn('[data] Supabase categories unavailable, using local only:', error);
  }

  return Array.from(categoriesMap.values());
}

export async function getCategorySlugs(): Promise<string[]> {
  const cats = await getCategories('en');
  return cats.map(c => c.slug);
}

export async function getCategoryBySlug(slug: string, locale: string = 'en'): Promise<Category|null> {
  const cats = await getCategories(locale);
  return cats.find(c => c.slug === slug) || null;
}

export async function getPostsByCategory(slug: string, limit = 24, locale: string = 'en'): Promise<Post[]> {
  const localArticles = await getLocalArticles();

  const localFiltered = localArticles.filter(article => {
    return article.category.slug === slug;
  });

  const isEn = locale === 'en';
  let supabasePosts: Post[] = [];

  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const supabase = getSupabaseClient();

    let query = supabase
      .from('published_articles')
      .select('*')
      .eq('published', true);

    if (isEn) {
      query = query.not('content_en', 'is', null);
    } else {
      query = query.not('content_pl', 'is', null);
    }

    query = query.order('created_at', { ascending: false }).limit(Math.max(limit * 10, 240));

    const { data: articles, error } = await query;

    if (error) throw new Error(`Supabase query failed: ${error.message}`);

    const categoryFiltered = (articles || []).filter((article: any) => {
      return normalizeCategory(article.category).slug === slug;
    });

    const uniqueArticles = dedupeArticlesBySlug(categoryFiltered, isEn ? 'en' : 'pl');

    supabasePosts = uniqueArticles.map((article: any) =>
      transformSupabaseArticleToPost(article, isEn)
    );

    console.log(`[data] Loaded ${supabasePosts.length} articles from Supabase for category ${slug}`);
  } catch (error) {
    console.warn('[data] Supabase unavailable for category, using local:', error);
  }

  const combinedPosts = [...localFiltered, ...supabasePosts];

  // Sort by date (newest first)
  combinedPosts.sort((a, b) => new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime());

  return combinedPosts.slice(0, limit);
}
