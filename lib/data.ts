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

// Строгая фильтрация статей по языку
function filterArticlesByLanguage(articles: Post[], locale: string): Post[] {
  if (locale === 'ru') {
    // Для русского языка показываем статьи без суффикса (русские) и с суффиксом -ru
    return articles.filter(article => 
      !article.slug.match(/-[a-z]{2}$/) || 
      article.slug.endsWith('-ru')
    );
  } else {
    // Для всех других языков показываем ТОЛЬКО статьи с соответствующим суффиксом
    // НИКОГДА не показываем русские статьи в неруссских версиях
    return articles.filter(article => 
      article.slug.endsWith(`-${locale}`)
    );
  }
}

// Комбинирование WordPress и локальных статей
async function combineArticles(wpArticles: Post[], locale: string = 'ru'): Promise<Post[]> {
  const localArticles = await getLocalArticles();
  const translatedArticles = await getTranslatedArticles();
  
  // Фильтруем локальные статьи по языку
  const localFiltered = filterArticlesByLanguage(localArticles, locale);
  
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
  
  // Комбинируем все статьи
  const allArticles = [
    ...wpArticles,
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
    // Получаем WordPress статьи
    const q = `
      query($first:Int!){
        posts(first:$first, where:{orderby:{field:DATE, order:DESC}}){
          nodes{
            slug title excerpt date
            featuredImage{ node{ sourceUrl } }
            categories(first:1){ nodes{ name slug } }
          }
        }
      }`;
    const data = await gql<{posts:{nodes:any[]}}>(q, { first: Math.floor(limit / 2) });
    const wpPosts = data.posts.nodes.map(n => ({
      slug: n.slug,
      title: strip(n.title) || "Untitled",
      excerpt: strip(n.excerpt),
      date: n.date,
      publishedAt: n.date,
      image: n.featuredImage?.node?.sourceUrl || "",
      category: n.categories?.nodes?.[0] || { name: "General", slug: "general" },
      contentHtml: "",
    }));

    // Комбинируем с локальными статьями
    return await combineArticles(wpPosts, locale);
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
  const q = `query{ posts(first: 1000){ nodes{ slug } } }`;
  const data = await gql<{posts:{nodes:{slug:string}[]}}>(q);
  return data.posts.nodes.map(n => n.slug);
}

export async function getPostBySlug(slug: string, locale: string = 'en'): Promise<Post|null> {
  // Сначала ищем в локальных статьях
  const localArticle = await getLocalArticleBySlug(slug);
  if (localArticle) {
    return localArticle;
  }

  // Если не найдено локально, ищем в WordPress
  try {
    const q1 = `query($slug:String!){
      postBy(slug:$slug){
        slug title content date
        featuredImage{ node{ sourceUrl } }
        categories{ nodes{ name slug } }
      } }`;
    const d1 = await gql<{postBy:any}>(q1, { slug });
    let p = d1.postBy;

    if (!p) {
      const q2 = `query($slug:ID!){
        post(id:$slug, idType: SLUG){
          slug title content date
          featuredImage{ node{ sourceUrl } }
          categories{ nodes{ name slug } }
        } }`;
      const d2 = await gql<{post:any}>(q2, { slug });
      p = d2.post;
    }
    if (!p) return null;

    return {
      slug: p.slug,
      title: strip(p.title),
      excerpt: "",
      date: p.date,
      publishedAt: p.date,
      image: p.featuredImage?.node?.sourceUrl || "",
      category: p.categories?.nodes?.[0] || { name: "General", slug: "general" },
      contentHtml: p.content || "",
    };
  } catch (error) {
    console.warn('WordPress not available, using only local articles');
    return null;
  }
}

export async function getRelated(cat: Category, excludeSlug: string, limit = 4): Promise<Post[]> {
  const q = `
    query($first:Int!, $cat:String!){
      posts(first:$first, where:{categoryName:$cat, orderby:{field:DATE, order:DESC}}){
        nodes{
          slug title excerpt date
          featuredImage{ node{ sourceUrl } }
          categories{ nodes{ name slug } }
        }
      }
    }`;
  const d = await gql<{posts:{nodes:any[]}}>(q, { first: 20, cat: cat.slug });
  return d.posts.nodes
    .filter(n => n.slug != excludeSlug)
    .slice(0, limit)
    .map(n => ({
      slug: n.slug,
      title: strip(n.title),
      excerpt: strip(n.excerpt),
      date: n.date,
      publishedAt: n.date,
      image: n.featuredImage?.node?.sourceUrl || "",
      category: n.categories?.nodes?.[0] || { name: "General", slug: "general" },
      contentHtml: "",
    }));
}

// Локальные категории как fallback с учетом языка
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
    default: // ru
      return [
        { name: "Искусственный интеллект", slug: "ai" },
        { name: "Apple", slug: "apple" },
        { name: "Технологии", slug: "tech" },
        { name: "Игры", slug: "games" },
        { name: "Digital", slug: "digital" },
        { name: "Новости", slug: "news-2" }
      ];
  }
};

export async function getCategories(locale: string = 'ru'): Promise<Category[]> {
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
  const cats = await getCategories('ru'); // Default to Russian for slugs
  return cats.map(c => c.slug);
}

export async function getCategoryBySlug(slug: string, locale: string = 'ru'): Promise<Category|null> {
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

  // Пытаемся получить статьи из WordPress
  let wpPosts: Post[] = [];
  try {
    const q = `
      query($first:Int!, $slug:String!){
        posts(first:$first, where:{categoryName:$slug, orderby:{field:DATE, order:DESC}}){
          nodes{
            slug title excerpt date
            featuredImage{ node{ sourceUrl } }
            categories{ nodes{ name slug } }
          }
        }
      }`;
    const d = await gql<{posts:{nodes:any[]}}>(q, { first: limit, slug });
    wpPosts = d.posts.nodes.map(n => ({
      slug: n.slug,
      title: strip(n.title),
      excerpt: strip(n.excerpt),
      date: n.date,
      publishedAt: n.date,
      image: n.featuredImage?.node?.sourceUrl || "",
      category: n.categories?.nodes?.[0] || { name: "General", slug: "general" },
      contentHtml: "",
    }));
  } catch (error) {
    // WordPress API недоступен, используем только локальные статьи
  }

  // WordPress уже отфильтровал по категории, просто объединяем с локальными
  const combinedPosts = [...localFiltered, ...wpPosts];
  
  // Сортируем по дате публикации (новые сверху)
  combinedPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  return combinedPosts.slice(0, limit);
}
