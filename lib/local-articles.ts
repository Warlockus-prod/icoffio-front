import type { Post, Category } from "./types";

// Локальные статьи (ВРЕМЕННО ОЧИЩЕНО ДЛЯ ВОССТАНОВЛЕНИЯ ДИЗАЙНА)
const localArticles: Post[] = [
  // Пустой массив до исправления дизайна сайта
];

// Временное хранилище для статей, добавленных через API
const runtimeArticles: Post[] = [];

// Функция для получения всех локальных статей
export async function getLocalArticles(): Promise<Post[]> {
  return [...localArticles, ...runtimeArticles];
}

// Функция для получения локальной статьи по slug
export async function getLocalArticleBySlug(slug: string): Promise<Post | null> {
  const allArticles = [...localArticles, ...runtimeArticles];
  return allArticles.find(article => article.slug === slug) || null;
}

// Функция для добавления новой статьи
export function addLocalArticle(article: Post): void {
  runtimeArticles.push(article);
}
