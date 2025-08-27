export type Category = { name: string; slug: string };
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
  content?: string;
  contentHtml?: string;
};
