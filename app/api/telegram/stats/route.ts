/**
 * TELEGRAM BOT STATISTICS API
 * 
 * Provides statistics and analytics for Telegram bot usage
 * 
 * Endpoints:
 * - GET /api/telegram/stats - Global statistics
 * - GET /api/telegram/stats?type=users - User statistics
 * - GET /api/telegram/stats?type=articles - Recent articles
 * - GET /api/telegram/stats?type=categories - Category statistics
 * - GET /api/telegram/stats?chat_id=123 - Specific user stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { telegramDB } from '@/lib/telegram-database-service';
import { isSupabaseConfigured } from '@/lib/supabase-client';
import { requireAdminRole } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'viewer', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        error: 'Database not configured',
        message: 'Supabase environment variables not set'
      }, { status: 503 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'global';
    const chatId = searchParams.get('chat_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Handle different stat types
    switch (type) {
      case 'global':
        const globalStats = await telegramDB.getGlobalStats();
        return NextResponse.json({
          success: true,
          type: 'global',
          data: globalStats
        });

      case 'users':
        const userStats = await telegramDB.getUserStats(limit);
        return NextResponse.json({
          success: true,
          type: 'users',
          count: userStats.length,
          data: userStats
        });

      case 'articles':
        if (chatId) {
          // Specific user's articles
          const userArticles = await telegramDB.getUserArticles(parseInt(chatId), limit);
          return NextResponse.json({
            success: true,
            type: 'user_articles',
            chat_id: parseInt(chatId),
            count: userArticles.length,
            data: userArticles
          });
        } else {
          // All recent articles
          const recentArticles = await telegramDB.getRecentArticles(limit);
          return NextResponse.json({
            success: true,
            type: 'recent_articles',
            count: recentArticles.length,
            data: recentArticles
          });
        }

      case 'categories':
        const categoryStats = await telegramDB.getCategoryStats();
        return NextResponse.json({
          success: true,
          type: 'categories',
          count: categoryStats.length,
          data: categoryStats
        });

      default:
        return NextResponse.json({
          error: 'Invalid type',
          message: `Unknown stat type: ${type}. Valid types: global, users, articles, categories`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Example requests:
 * 
 * GET /api/telegram/stats
 * → Global statistics (total users, articles, etc)
 * 
 * GET /api/telegram/stats?type=users&limit=20
 * → Top 20 users by articles published
 * 
 * GET /api/telegram/stats?type=articles&limit=50
 * → 50 most recent articles
 * 
 * GET /api/telegram/stats?type=articles&chat_id=123456
 * → All articles by specific user
 * 
 * GET /api/telegram/stats?type=categories
 * → Statistics by category
 */











