/**
 * TELEGRAM SIMPLE - PENDING ARTICLES STATE
 * 
 * Stores articles awaiting category selection / publish confirmation.
 * In-memory (serverless-safe for short-lived flows: user sends → selects category → done).
 */

interface PendingArticle {
  chatId: number;
  article: {
    title: string;
    content: string;
    excerpt: string;
    category: string;
    wordCount: number;
  };
  isUrl: boolean;
  originalText: string;
  createdAt: number;
}

// In-memory store with auto-cleanup (5 min TTL)
const pendingArticles = new Map<number, PendingArticle>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setPendingArticle(chatId: number, data: Omit<PendingArticle, 'chatId' | 'createdAt'>): void {
  pendingArticles.set(chatId, {
    ...data,
    chatId,
    createdAt: Date.now(),
  });

  // Auto-cleanup after TTL
  setTimeout(() => {
    const entry = pendingArticles.get(chatId);
    if (entry && Date.now() - entry.createdAt >= TTL_MS) {
      pendingArticles.delete(chatId);
    }
  }, TTL_MS);
}

export function getPendingArticle(chatId: number): PendingArticle | null {
  const entry = pendingArticles.get(chatId);
  if (!entry) return null;
  
  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    pendingArticles.delete(chatId);
    return null;
  }
  
  return entry;
}

export function removePendingArticle(chatId: number): void {
  pendingArticles.delete(chatId);
}

export function updatePendingCategory(chatId: number, category: string): boolean {
  const entry = pendingArticles.get(chatId);
  if (!entry) return false;
  entry.article.category = category;
  return true;
}
