/**
 * TELEGRAM USER STATS API
 * 
 * GET /api/telegram/user-stats?userId=123456
 * 
 * Returns statistics for a specific Telegram user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramUserStats } from '@/lib/supabase-analytics';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const userIdParam = searchParams.get('userId');

    if (!userIdParam) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdParam);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'userId must be a valid number' },
        { status: 400 }
      );
    }

    // Get user stats from Supabase
    const stats = await getTelegramUserStats(userId);

    if (!stats) {
      return NextResponse.json({
        success: true,
        stats: null,
        message: 'No submissions found for this user',
      });
    }

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('[User Stats API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}







