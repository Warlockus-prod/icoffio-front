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

// Строгая фильтрация статей по языку (только английский и польский)
function filterArticlesByLanguage(articles: Post[], locale: string): Post[] {
  // Показываем ТОЛЬКО статьи с соответствующим языковым суффиксом
  // Поддерживаемые языки: en, pl
  if (locale === 'en' || locale === 'pl') {
    return articles.filter(article => 
      article.slug.endsWith(`-${locale}`)
    );
  }
  
  // Для неподдерживаемых языков возвращаем пустой массив
  console.warn(`Unsupported locale: ${locale}. Only 'en' and 'pl' are supported.`);
  return [];
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
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function getAllPosts(limit = 12, locale = 'en'): Promise<Post[]> {
  try {
    // ✅ ИСПРАВЛЕНО: Используем WordPress REST API вместо GraphQL
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 120 } // ISR кеширование
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`WordPress API error: ${data.error}`);
    }
    
    // Преобразуем данные из WordPress API в формат Post
    const wpPosts: Post[] = data.articles.map((article: any) => ({
      slug: article.slug,
      title: strip(article.title) || "Untitled",
      excerpt: strip(article.excerpt),
      date: article.date,
      publishedAt: article.date,
      image: article.image || "",
      category: article.categories?.nodes?.[0] || { name: "General", slug: "general" },
      contentHtml: article.content || "",
    }));

    // Комбинируем с локальными статьями
    return await combineArticles(wpPosts.slice(0, Math.floor(limit / 2)), locale);
  } catch (error) {
    console.warn('Ошибка загрузки WordPress статей, используем только локальные:', error);
    
    // Fallback к только локальным статьям
    const localArticles = await getLocalArticles();
    const filtered = filterArticlesByLanguage(localArticles, locale);
    return filtered.slice(0, limit);
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

  // ✅ ИСПРАВЛЕНО: Используем WordPress REST API вместо GraphQL
  try {
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 120 }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        // Ищем статью по slug
        const article = data.articles.find((article: any) => article.slug === slug);
        
        if (article) {
          return {
            slug: article.slug,
            title: strip(article.title),
            excerpt: strip(article.excerpt),
            date: article.date,
            publishedAt: article.date,
            image: article.image || "",
            category: article.categories?.nodes?.[0] || { name: "General", slug: "general" },
            contentHtml: article.content || "",
          };
        }
      }
    }
  } catch (error) {
    console.warn('WordPress REST API unavailable, using only local articles:', error);
  }
  
  return null;
}

export async function getRelated(cat: Category, excludeSlug: string, limit = 4): Promise<Post[]> {
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
        // Фильтруем по категории и исключаем текущую статью
        return data.articles
          .filter((article: any) => {
            const articleCategory = article.categories?.nodes?.[0]?.slug;
            return articleCategory === cat.slug && article.slug !== excludeSlug;
          })
          .slice(0, limit)
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
    console.warn('WordPress REST API unavailable for getRelated:', error);
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
  combinedPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  return combinedPosts.slice(0, limit);
}
