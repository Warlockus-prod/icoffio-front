export type Category = { name: string; slug: string };
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  category: Category;
  contentHtml: string;
};
