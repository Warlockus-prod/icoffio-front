import type { Post, Category } from "./types";
import { getLocalArticles as getLocalArticlesFromFile, getLocalArticleBySlug as getLocalArticleBySlugFromFile } from "./local-articles";
import { getSiteBaseUrl } from './site-url';

const WP = process.env.NEXT_PUBLIC_WP_ENDPOINT || "https://icoffio.com/graphql";
const SITE_BASE_URL = getSiteBaseUrl();

// Re-export from local-articles.ts
const getLocalArticles = getLocalArticlesFromFile;
const getLocalArticleBySlug = getLocalArticleBySlugFromFile;

/** WordPress GraphQL query — used only as fallback for category fetching */
async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!WP || WP === "undefined") {
    throw new Error("WordPress GraphQL endpoint not configured");
  }
  
  const res = await fetch(WP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 120 },
  });
  
  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }
  
  const json = await res.json();
  
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  
  return json.data;
}

const strip = (s?: string) => (s || "").replace(/<[^>]+>/g, "").trim();

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
  // ✅ ПРИОРИТЕТ: Сначала проверяем runtime статьи (свежие, только что созданные)
  const localArticles = await getLocalArticles();
  const runtimeFiltered = filterArticlesByLanguage(localArticles, locale);
  
  // Если есть runtime статьи, показываем их первыми
  if (runtimeFiltered.length > 0) {
    console.log(`✅ Found ${runtimeFiltered.length} local/runtime articles for ${locale}`);
  }
  
  try {
    // ✅ v7.14.0: Используем Supabase API для старых статей
    const response = await fetch(`${SITE_BASE_URL}/api/supabase-articles?lang=${locale}&limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 } // ✅ Уменьшен кеш до 60 сек для быстрого обновления
    });
    
    if (!response.ok) {
      throw new Error(`Supabase API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Supabase API error: ${data.error}`);
    }
    
    // Transform Supabase API data into Post format
    const dbPosts: Post[] = data.articles.map((article: Record<string, unknown>) => ({
      slug: article.slug as string,
      title: (article.title as string) || "Untitled",
      excerpt: (article.excerpt as string) || "",
      date: article.date as string,
      publishedAt: article.date as string,
      image: article.image && (article.image as string).trim() !== '' ? article.image as string : '',
      category: normalizeCategory(article.category),
      contentHtml: (article.content as string) || "",
      content: (article.content as string) || "",
      tags: Array.isArray(article.tags) ? (article.tags as string[]).map((tag: string) => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') })) : []
    }));

    // ✅ ВАЖНО: Runtime статьи ПЕРВЫМИ, затем Supabase статьи
    const combined = [...runtimeFiltered, ...dbPosts];
    
    // Удаляем дубликаты по slug (runtime имеют приоритет)
    const unique = combined.filter((article, index, self) =>
      index === self.findIndex((a) => a.slug === article.slug)
    );
    
    return unique.slice(0, limit);
  } catch (error) {
    console.warn('Ошибка загрузки Supabase статей, используем только локальные:', error);
    
    // Fallback к только локальным статьям (включая runtime)
    return runtimeFiltered.slice(0, limit);
  }
}

export async function getTopPosts(limit = 1) { return getAllPosts(limit); }

export async function getAllSlugs(): Promise<string[]> {
  try {
    // ✅ v8.5.2: Используем SUPABASE вместо WordPress
    const responses = await Promise.all([
      fetch(`${SITE_BASE_URL}/api/supabase-articles?lang=en&limit=200`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 120 }
      }),
      fetch(`${SITE_BASE_URL}/api/supabase-articles?lang=pl&limit=200`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 120 }
      })
    ]);
    
    const allSlugs: string[] = [];
    
    for (const response of responses) {
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.articles) {
          // Собираем slug'и из Supabase
          const slugs = data.articles.map((article: any) => article.slug);
          allSlugs.push(...slugs);
        }
      }
    }
    
    if (allSlugs.length > 0) {
      // Добавляем локальные slug'и
      const localArticles = await getLocalArticles();
      const localSlugs = localArticles.map(article => article.slug);
      
      // Объединяем и убираем дубликаты
      return [...new Set([...allSlugs, ...localSlugs])];
    }
  } catch (error) {
    console.warn('Supabase API unavailable for getAllSlugs, using local articles:', error);
  }
  
  // Fallback к только локальным статьям
  const localArticles = await getLocalArticles();
  return localArticles.map(article => article.slug);
}

export async function getPostBySlug(slug: string, locale: string = 'en'): Promise<Post|null> {
  // Сначала ищем в локальных статьях
  const localArticle = await getLocalArticleBySlug(slug);
  if (localArticle) {
    return localArticle;
  }

  // ✅ v7.14.0: Используем Supabase API вместо WordPress
  try {
    const response = await fetch(`${SITE_BASE_URL}/api/supabase-articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'get-by-slug', 
        slug, 
        language: locale 
      }),
      next: { revalidate: 120 }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.article) {
        const article = data.article;
        return {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          date: article.date,
          publishedAt: article.date,
          image: article.image || "",
          category: normalizeCategory(article.category),
          contentHtml: article.content || "",
          content: article.content || "",
          tags: article.tags?.map((tag: string) => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') })) || []
        };
      }
    }
  } catch (error) {
    console.warn('Supabase API unavailable, using only local articles:', error);
  }
  
  return null;
}

export async function getRelated(cat: Category, excludeSlug: string, limit = 4): Promise<Post[]> {
  // Detect language from slug
  const locale = excludeSlug.endsWith('-pl') ? 'pl' : 'en';
  
  try {
    // ✅ v7.14.0: Используем Supabase API
    const response = await fetch(`${SITE_BASE_URL}/api/supabase-articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'get-related',
        category: cat.slug || cat.name,
        excludeSlug,
        language: locale,
        limit
      }),
      next: { revalidate: 120 }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.articles) {
        return data.articles.map((article: Record<string, unknown>) => ({
          slug: article.slug as string,
          title: article.title as string,
          excerpt: article.excerpt as string,
          date: article.date as string,
          publishedAt: article.date as string,
          image: (article.image as string) || "",
          category: normalizeCategory(article.category) || cat,
          contentHtml: "",
        }));
      }
    }
  } catch (error) {
    console.warn('Supabase API unavailable for getRelated:', error);
  }
  
  // Fallback к локальным статьям
  const localArticles = await getLocalArticles();
  return localArticles
    .filter(article => article.category.slug === cat.slug && article.slug !== excludeSlug)
    .slice(0, limit);
}

// Локальные категории только для английского и польского языков
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
      // Для неподдерживаемых языков возвращаем английские категории
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
  try {
    // Пробуем получить категории из WordPress
    const q = `query{ categories(first:100){ nodes{ name slug } } }`;
    const d = await gql<{categories:{nodes:Category[]}}>(q);
    
    // Получаем локализованные категории
    const localCategories = getLocalCategories(locale);
    const wpCategories = d.categories.nodes || [];
    const allCategories = [...localCategories];
    
    // Добавляем уникальные категории из WordPress (только slug, имя остается локализованным)
    for (const wpCat of wpCategories) {
      if (!allCategories.find(cat => cat.slug === wpCat.slug)) {
        // Для WordPress категорий используем их имена как есть
        allCategories.push(wpCat);
      }
    }
    
    return allCategories;
  } catch (error) {
    console.warn('WordPress категории недоступны, используем локальные:', error);
    return getLocalCategories(locale);
  }
}

export async function getCategorySlugs(): Promise<string[]> {
  const cats = await getCategories('en'); // Default to English for slugs
  return cats.map(c => c.slug);
}

export async function getCategoryBySlug(slug: string, locale: string = 'en'): Promise<Category|null> {
  const cats = await getCategories(locale);
  return cats.find(c => c.slug === slug) || null;
}

export async function getPostsByCategory(slug: string, limit = 24, locale: string = 'en'): Promise<Post[]> {
  // Получаем локальные статьи и фильтруем по категории
  const localArticles = await getLocalArticles();
  
  const localFiltered = localArticles.filter(article => {
    const categoryMatch = article.category.slug === slug;
    return categoryMatch;
  });

  // ✅ v8.5.2: Используем SUPABASE вместо WordPress (Single Source of Truth)
  let supabasePosts: Post[] = [];
  try {
    const response = await fetch(`${SITE_BASE_URL}/api/supabase-articles?lang=${locale}&category=${slug}&limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 120 }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.articles) {
        supabasePosts = data.articles.map((article: Record<string, unknown>) => ({
          slug: article.slug as string,
          title: article.title as string,
          excerpt: strip((article.excerpt as string) || ''),
          date: article.date as string,
          publishedAt: article.date as string,
          image: (article.image as string) || "",
          category: normalizeCategory(article.category),
          contentHtml: (article.content as string) || "",
          content: (article.content as string) || "",
          tags: Array.isArray(article.tags) ? (article.tags as string[]).map((tag: string) => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') })) : []
        }));
        
        console.log(`✅ Loaded ${supabasePosts.length} articles from Supabase for category ${slug}`);
      }
    }
  } catch (error) {
    // Supabase API недоступен, используем только локальные статьи
    console.warn('Supabase API недоступен для категории, используем локальные статьи:', error);
  }

  // Объединяем Supabase и локальные статьи
  const combinedPosts = [...localFiltered, ...supabasePosts];
  
  // Сортируем по дате публикации (новые сверху)
  combinedPosts.sort((a, b) => new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime());
  
  return combinedPosts.slice(0, limit);
}
