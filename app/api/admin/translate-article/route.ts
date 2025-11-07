/**
 * TRANSLATE ARTICLE API
 * 
 * POST /api/admin/translate-article
 * 
 * Translates article content between EN and PL
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateArticleContent } from '@/lib/ai-copywriting-service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      content,
      title,
      fromLanguage = 'en',
      toLanguage = 'pl'
    } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const result = await translateArticleContent(
      content,
      fromLanguage,
      toLanguage,
      title
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Translation API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}










