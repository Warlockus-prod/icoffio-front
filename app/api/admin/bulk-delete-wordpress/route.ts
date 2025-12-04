/**
 * BULK DELETE WORDPRESS ARTICLES
 * Использует wordpress-service который уже работает
 */

import { NextRequest, NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress-service';

export const runtime = 'nodejs'; // Используем nodejs вместо edge для доступа к переменным

interface BulkDeleteRequest {
  slugs: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkDeleteRequest = await request.json();
    const { slugs } = body;

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid slugs array',
      }, { status: 400 });
    }

    // Проверяем доступность WordPress
    const isAvailable = await wordpressService.isAvailable();
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'WordPress service not available',
      }, { status: 500 });
    }

    const results = [];
    let deleted = 0;
    let failed = 0;
    let notFound = 0;

    // Получаем все статьи из WordPress для поиска ID
    const allArticlesResponse = await wordpressService.getArticles({ per_page: 1000 });
    
    if (!allArticlesResponse.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch articles from WordPress',
      }, { status: 500 });
    }

    // Создаем мапу slug -> id
    const slugToId = new Map();
    allArticlesResponse.articles.forEach(article => {
      if (article.slug) {
        slugToId.set(article.slug, article.id);
      }
    });

    // Удаляем статьи
    for (const slug of slugs) {
      try {
        const postId = slugToId.get(slug);
        
        if (!postId) {
          notFound++;
          results.push({ slug, success: false, error: 'Not found' });
          continue;
        }

        const deleteResult = await wordpressService.deleteArticle(postId);
        
        if (deleteResult.success) {
          deleted++;
          results.push({ slug, success: true, wpPostId: postId });
        } else {
          failed++;
          results.push({ slug, success: false, error: deleteResult.error || 'Delete failed' });
        }

        // Задержка между удалениями
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        failed++;
        results.push({ slug, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      failed,
      notFound,
      results,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 });
  }
}

