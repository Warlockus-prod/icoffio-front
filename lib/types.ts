export type Category = { name: string; slug: string };
export type Tag = { name: string; slug: string };

export type Post = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  date?: string;
  publishedAt: string;
  image: string;
  imageAlt?: string;
  category: Category;
  tags?: Tag[];
  content?: string;
  contentHtml?: string;
  images?: string[]; // Дополнительные изображения для статьи
  author?: string; // ✅ ДОБАВЛЕНО: Автор статьи
};
