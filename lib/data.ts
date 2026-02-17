import type { Post, Category } from "./types";
import { getLocalArticles as getLocalArticlesFromFile, getLocalArticleBySlug as getLocalArticleBySlugFromFile } from "./local-articles";
import { getSupabaseClient, isSupabaseConfigured } from './supabase-client';
import { sanitizeExcerptText, sanitizeArticleBodyText, normalizeAiGeneratedText } from './utils/content-formatter';
import { normalizeTitleForPublishing, TITLE_MAX_LENGTH } from './utils/title-policy';

// Re-export from local-articles.ts
const getLocalArticles = getLocalArticlesFromFile;
const getLocalArticleBySlug = getLocalArticleBySlugFromFile;
const ENABLE_LOCAL_RUNTIME_ARTICLES =
  process.env.ENABLE_LOCAL_RUNTIME_ARTICLES === 'true' || process.env.NODE_ENV !== 'production';

async function loadRuntimeArticles(): Promise<Post[]> {
  if (!ENABLE_LOCAL_RUNTIME_ARTICLES) return [];
  return getLocalArticles();
}

async function loadRuntimeArticleBySlug(slug: string): Promise<Post | null> {
  if (!ENABLE_LOCAL_RUNTIME_ARTICLES) return null;
  return getLocalArticleBySlug(slug);
}

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

function extractMarkdownHeading(content: string): string {
  if (!content) return '';
  const headingMatch = content.match(/^\s*#\s+(.+)$/m);
  if (!headingMatch) return '';
  return sanitizeExcerptText(headingMatch[1] || '', 180).replace(/[.]{3,}\s*$/, '').trim();
}

function extractLeadSentence(text: string, maxLength = 140): string {
  const cleaned = sanitizeExcerptText(text || '', Math.max(maxLength * 2, 220))
    .replace(/\s+/g, ' ')
    .replace(/[.]{3,}\s*$/, '')
    .trim();

  if (!cleaned) return '';

  const sentenceMatch = cleaned.match(/^(.{20,220}?[.!?])(?:\s|$)/);
  const sentence = sentenceMatch ? sentenceMatch[1].trim() : cleaned;
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 3).trimEnd()}...`;
}

function normalizeFrontendTitle(value: string): string {
  const cleaned = sanitizeExcerptText(value || '', 260).replace(/[.]{3,}\s*$/, '').trim();
  if (!cleaned) {
    return '';
  }

  return normalizeTitleForPublishing(cleaned, {
    minLength: 40,
    maxLength: TITLE_MAX_LENGTH,
    fallback: cleaned,
  });
}

function resolveLocalizedTitle(article: any, language: 'en' | 'pl'): string {
  const baseTitle = normalizeFrontendTitle(article?.title || '');

  if (language === 'pl') {
    const heading = normalizeFrontendTitle(extractMarkdownHeading(article?.content_pl || ''));
    if (heading) return heading;

    const excerptPl = normalizeFrontendTitle(article?.excerpt_pl || '');
    if (excerptPl) return excerptPl;

    const leadPl = normalizeFrontendTitle(extractLeadSentence(article?.content_pl || '', 140));
    if (leadPl) return leadPl;
  }

  if (baseTitle) return baseTitle;

  const headingEn = normalizeFrontendTitle(extractMarkdownHeading(article?.content_en || ''));
  if (headingEn) return headingEn;

  const excerptEn = normalizeFrontendTitle(article?.excerpt_en || '');
  if (excerptEn) return excerptEn;

  const leadEn = normalizeFrontendTitle(extractLeadSentence(article?.content_en || '', 140));
  if (leadEn) return leadEn;

  return 'Untitled';
}

/** Transform a raw Supabase row into a Post for list views */
function transformSupabaseArticleToPost(article: any, isEn: boolean): Post {
  const slug = isEn ? article.slug_en : article.slug_pl;
  const content = isEn ? article.content_en : article.content_pl;
  const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;
  const languageKey: 'en' | 'pl' = isEn ? 'en' : 'pl';
  const title = resolveLocalizedTitle(article, languageKey);

  return {
    slug: slug,
    title,
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
  const runtimeArticles = await loadRuntimeArticles();
  const runtimeFiltered = filterArticlesByLanguage(runtimeArticles, locale);

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

    // Runtime articles (dev only) FIRST, then Supabase articles
    const combined = runtimeFiltered.length > 0
      ? [...runtimeFiltered, ...dbPosts]
      : dbPosts;

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
      if (!ENABLE_LOCAL_RUNTIME_ARTICLES) {
        return [...new Set(allSlugs)];
      }
      const localArticles = await loadRuntimeArticles();
      const localSlugs = localArticles.map(article => article.slug);
      return [...new Set([...allSlugs, ...localSlugs])];
    }
  } catch (error) {
    console.warn('[data] Supabase unavailable for getAllSlugs:', error);
  }

  const localArticles = await loadRuntimeArticles();
  return localArticles.map(article => article.slug);
}

export async function getPostBySlug(slug: string, locale: string = 'en'): Promise<Post|null> {
  // Direct Supabase query (source of truth in production)
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

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const articleLanguage = slug?.endsWith('-pl') || locale === 'pl' ? 'pl' : 'en';
    const article = selectBestArticleVersion(articles || [], articleLanguage);

    if (!article) {
      return await loadRuntimeArticleBySlug(slug);
    }

    const isEn = locale === 'en' || article.slug_en === slug;
    const languageKey: 'en' | 'pl' = isEn ? 'en' : 'pl';
    const localizedTitle = resolveLocalizedTitle(article, languageKey);

    // Normalize Polish body: remove duplicated markdown heading if present.
    let plContent = article.content_pl || '';
    if (!isEn && plContent) {
      plContent = plContent.replace(/^#\s+.+\n\n?/m, '');
    }
    const rawContent = isEn ? article.content_en || '' : plContent || '';

    return {
      slug: isEn ? article.slug_en : article.slug_pl,
      title: localizedTitle,
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
    return await loadRuntimeArticleBySlug(slug);
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

    const fetchRows = async (categorySlug?: string) => {
      let query = supabase
        .from('published_articles')
        .select('*')
        .eq('published', true)
        .not(isEn ? 'slug_en' : 'slug_pl', 'eq', excludeSlug);

      if (categorySlug) {
        query = query.eq('category', categorySlug);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(240);

      if (error) throw new Error(`Supabase related query failed: ${error.message}`);
      return data || [];
    };

    let rows = targetCategorySlug ? await fetchRows(targetCategorySlug) : [];
    if (rows.length === 0) {
      rows = await fetchRows();
    }

    const uniqueArticles = dedupeArticlesBySlug(rows, isEn ? 'en' : 'pl');

    return uniqueArticles.slice(0, limit).map((article: any) => {
      const slug = isEn ? article.slug_en : article.slug_pl;
      const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;
      const languageKey: 'en' | 'pl' = isEn ? 'en' : 'pl';
      return {
        slug: slug,
        title: resolveLocalizedTitle(article, languageKey),
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
  const localArticles = await loadRuntimeArticles();
  if (localArticles.length === 0) {
    return [];
  }
  const sameCategory = localArticles
    .filter(article => article.category.slug === cat.slug && article.slug !== excludeSlug)
    .slice(0, limit);

  if (sameCategory.length > 0) {
    return sameCategory;
  }

  return localArticles
    .filter(article => article.slug !== excludeSlug)
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
  const localArticles = await loadRuntimeArticles();

  const localFiltered = localArticles.filter(article => {
    return article.category.slug === slug;
  });

  const isEn = locale === 'en';
  let supabasePosts: Post[] = [];

  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const supabase = getSupabaseClient();

    const fetchRows = async (categorySlug?: string) => {
      let query = supabase
        .from('published_articles')
        .select('*')
        .eq('published', true);

      if (categorySlug) {
        query = query.eq('category', categorySlug);
      }

      if (isEn) {
        query = query.not('content_en', 'is', null);
      } else {
        query = query.not('content_pl', 'is', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(Math.max(limit * 10, 240));

      if (error) throw new Error(`Supabase query failed: ${error.message}`);
      return data || [];
    };

    const categoryRows = await fetchRows(slug);

    const uniqueArticles = dedupeArticlesBySlug(categoryRows, isEn ? 'en' : 'pl');

    supabasePosts = uniqueArticles.map((article: any) =>
      transformSupabaseArticleToPost(article, isEn)
    );

    console.log(`[data] Loaded ${supabasePosts.length} articles from Supabase for category ${slug}`);

    const combinedByCategory = localFiltered.length > 0
      ? [...localFiltered, ...supabasePosts]
      : [...supabasePosts];
    combinedByCategory.sort((a, b) => new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime());

    if (combinedByCategory.length > 0) {
      return combinedByCategory.slice(0, limit);
    }

    const fallbackRows = await fetchRows();
    const fallbackUnique = dedupeArticlesBySlug(fallbackRows, isEn ? 'en' : 'pl');
    const fallbackSupabasePosts = fallbackUnique.map((article: any) =>
      transformSupabaseArticleToPost(article, isEn)
    );
    const fallbackLocalPosts = filterArticlesByLanguage(localArticles, locale);
    const fallbackCombined = [...fallbackSupabasePosts, ...fallbackLocalPosts];
    fallbackCombined.sort((a, b) => new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime());
    return fallbackCombined.slice(0, limit);
  } catch (error) {
    console.warn('[data] Supabase unavailable for category, using local:', error);
  }

  if (localFiltered.length > 0) {
    const sortedLocal = [...localFiltered];
    sortedLocal.sort((a, b) => new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime());
    return sortedLocal.slice(0, limit);
  }

  return filterArticlesByLanguage(localArticles, locale).slice(0, limit);
}
