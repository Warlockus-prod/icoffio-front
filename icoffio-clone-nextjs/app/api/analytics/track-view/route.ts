/**
 * API ENDPOINT: TRACK ARTICLE VIEW
 * 
 * POST /api/analytics/track-view
 * Body: { articleSlug: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackArticleView } from '@/lib/supabase-analytics';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleSlug } = body;

    if (!articleSlug || typeof articleSlug !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid articleSlug' },
        { status: 400 }
      );
    }

    // Получаем метаданные для tracking
    const userIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    const referrer = request.headers.get('referer') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Отслеживаем просмотр
    const success = await trackArticleView(
      articleSlug,
      userIp,
      referrer,
      userAgent
    );

    if (!success) {
      // Не критичная ошибка - возвращаем 200 чтобы не ломать UX
      return NextResponse.json({ 
        tracked: false, 
        message: 'Analytics tracking unavailable' 
      });
    }

    return NextResponse.json({ 
      tracked: true,
      articleSlug 
    });

  } catch (error) {
    console.error('[Track View API] Error:', error);
    
    // Возвращаем 200 даже при ошибке - analytics не должен ломать сайт
    return NextResponse.json({ 
      tracked: false, 
      error: 'Internal error' 
    });
  }
}










