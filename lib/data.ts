import type { Post, Category } from "./types";
import { getLocalArticles as getLocalArticlesFromFile, getLocalArticleBySlug as getLocalArticleBySlugFromFile } from "./local-articles";

const WP = process.env.NEXT_PUBLIC_WP_ENDPOINT || "https://icoffio.com/graphql";

// Переиспользуем функции из local-articles.ts
const getLocalArticles = getLocalArticlesFromFile;
const getLocalArticleBySlug = getLocalArticleBySlugFromFile;

async function gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
  if (!WP || WP === "undefined") {
    throw new Error("WordPress GraphQL endpoint not configured");
  }
  
  const res = await fetch(WP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 120 }, // ISR
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

// Загрузка переводов статей (cloud-ready)
async function getTranslatedArticles(): Promise<Record<string, any>> {
  // В cloud среде переводы хранятся в памяти или внешней БД
  // Пока возвращаем пустой массив, переводы будут генерироваться on-demand
  
  // В будущем здесь можно подключить:
  // - External database
  // - Headless CMS
  // - Redis cache
  // - CDN storage
  
  return [];
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

// Улучшенная фильтрация статей по языку с детектированием контента
function filterArticlesByLanguage(articles: Post[], locale: string): Post[] {
  console.log(`🌍 Filtering ${articles.length} articles for locale: ${locale}`);
  
  // Поддерживаемые языки: en, pl (сайт НЕ поддерживает русский)
  if (!['en', 'pl'].includes(locale)) {
    console.warn(`Unsupported locale: ${locale}. Supported: 'en', 'pl' only.`);
    return [];
  }
  
  const filtered = articles.filter(article => {
    // 1. Проверяем slug на наличие суффикса языка (основная проверка)
    const slugContainsLocale = article.slug.includes(`-${locale}`);
    
    // 2. Проверяем контент статьи (title, excerpt, content) на соответствие языку
    const contentToCheck = `${article.title} ${article.excerpt || ''} ${article.content || ''}`;
    
    if (locale === 'en') {
      // Для английской версии: исключаем статьи с кириллицей или польскими символами
      const hasUnwantedChars = hasCyrillic(contentToCheck) || hasPolish(contentToCheck);
      
      if (hasUnwantedChars) {
        console.log(`🚫 Excluded from EN: ${article.slug} (contains non-English characters)`);
        return false;
      }
      
      // Разрешаем статьи с -en в slug ИЛИ без специфичных языковых маркеров
      const isEnglish = slugContainsLocale || (!hasCyrillic(contentToCheck) && !hasPolish(contentToCheck));
      
      if (isEnglish) {
        console.log(`✅ Article matched for EN: ${article.slug}`);
      }
      return isEnglish;
    }
    
    if (locale === 'pl') {
      // Для польской версии: требуем -pl в slug И исключаем кириллицу
      const hasRussian = hasCyrillic(contentToCheck);
      
      if (hasRussian) {
        console.log(`🚫 Excluded from PL: ${article.slug} (contains Cyrillic)`);
        return false;
      }
      
      const isPolish = slugContainsLocale && !hasRussian;
      
      if (isPolish) {
        console.log(`✅ Article matched for PL: ${article.slug}`);
      }
      return isPolish;
    }
    
    return false;
  });
  
  console.log(`📊 Filtered ${filtered.length}/${articles.length} articles for ${locale}`);
  return filtered;
}

// Комбинирование WordPress и локальных статей
async function combineArticles(wpArticles: Post[], locale: string = 'en'): Promise<Post[]> {
  const localArticles = await getLocalArticles();
  const translatedArticles = await getTranslatedArticles();
  
  // Фильтруем локальные статьи по языку
  const localFiltered = filterArticlesByLanguage(localArticles, locale);
  
  // ИСПРАВЛЕНИЕ: Фильтруем WordPress статьи по языку!
  const wpFiltered = filterArticlesByLanguage(wpArticles, locale);
  
  // Добавляем переводы для указанного языка (пока пустой массив)
  const translatedForLocale: Post[] = [];
  
  // В будущем здесь будет логика загрузки переводов
  // if (Array.isArray(translatedArticles)) {
  //   for (const articleGroup of translatedArticles) {
  //     if (articleGroup.translations && articleGroup.translations[locale]) {
  //       translatedForLocale.push(articleGroup.translations[locale]);
  //     }
  //   }
  // }
  
  // Комбинируем все статьи (ВСЕ уже отфильтрованы по языку!)
  const allArticles = [
    ...wpFiltered,     // <- ИСПРАВЛЕНО: используем отфильтрованные WordPress статьи
    ...localFiltered,
    ...translatedForLocale
  ];
  
  // Удаляем дубликаты по slug
  const uniqueArticles = allArticles.filter((article, index, self) => 
    index === self.findIndex(a => a.slug === article.slug)
  );
  
  // Сортируем по дате публикации (новые первыми)
  return uniqueArticles.sort((a, b) => 
    new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime()
  );
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
    const response = await fetch(`https://app.icoffio.com/api/supabase-articles?lang=${locale}&limit=${limit}`, {
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
    
    // Преобразуем данные из Supabase API в формат Post
    const dbPosts: Post[] = data.articles.map((article: any) => ({
      slug: article.slug,
      title: article.title || "Untitled",
      excerpt: article.excerpt || "",
      date: article.date,
      publishedAt: article.date,
      image: article.image && article.image.trim() !== '' ? article.image : '',
      category: article.category || { name: "General", slug: "general" },
      contentHtml: article.content || "",
      content: article.content || "",
      tags: article.tags?.map((tag: string) => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') })) || []
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
    // ✅ ИСПРАВЛЕНО: Используем WordPress REST API вместо GraphQL
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 120 }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        // Возвращаем все slug'и из WordPress статей
        const wpSlugs = data.articles.map((article: any) => article.slug);
        
        // Добавляем локальные slug'и
        const localArticles = await getLocalArticles();
        const localSlugs = localArticles.map(article => article.slug);
        
        // Объединяем и убираем дубликаты
        return [...new Set([...wpSlugs, ...localSlugs])];
      }
    }
  } catch (error) {
    console.warn('WordPress REST API unavailable for getAllSlugs, using local articles:', error);
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
    const response = await fetch('https://app.icoffio.com/api/supabase-articles', {
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
          category: article.category || { name: "General", slug: "general" },
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
    const response = await fetch('https://app.icoffio.com/api/supabase-articles', {
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
        return data.articles.map((article: any) => ({
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          date: article.date,
          publishedAt: article.date,
          image: article.image || "",
          category: article.category || cat,
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

  // ✅ ИСПРАВЛЕНО: Используем WordPress REST API вместо GraphQL
  let wpPosts: Post[] = [];
  try {
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 120 }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        // Фильтруем по категории и преобразуем формат
        wpPosts = data.articles
          .filter((article: any) => {
            // Проверяем что категория совпадает
            const articleCategory = article.categories?.nodes?.[0]?.slug;
            return articleCategory === slug;
          })
          .map((article: any) => ({
            slug: article.slug,
            title: strip(article.title),
            excerpt: strip(article.excerpt),
            date: article.date,
            publishedAt: article.date,
            image: article.image || "",
            category: article.categories?.nodes?.[0] || { name: "General", slug: "general" },
            contentHtml: article.content || "",
          }));
      }
    }
  } catch (error) {
    // WordPress API недоступен, используем только локальные статьи
    console.warn('WordPress API недоступен для категории, используем локальные статьи:', error);
  }

  // Объединяем WordPress и локальные статьи
  const combinedPosts = [...localFiltered, ...wpPosts];
  
  // Сортируем по дате публикации (новые сверху)
  combinedPosts.sort((a, b) => new Date(b.publishedAt || b.date || 0).getTime() - new Date(a.publishedAt || a.date || 0).getTime());
  
  return combinedPosts.slice(0, limit);
}
