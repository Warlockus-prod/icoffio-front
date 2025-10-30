/**
 * API ENDPOINT: Generate Article Content
 * 
 * POST /api/admin/generate-article-content
 * 
 * Generates full article content from short prompt using GPT-4o
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateArticleContent, estimateGenerationCost } from '@/lib/ai-copywriting-service';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for generation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      prompt,
      title,
      category,
      language = 'en',
      targetWords = 600,
      style = 'professional'
    } = body;

    // Validation
    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt must be at least 10 characters'
        },
        { status: 400 }
      );
    }

    // Generate article
    const result = await generateArticleContent({
      prompt,
      title,
      category,
      language,
      targetWords,
      style
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Generate Article Content Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate article content'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/generate-article-content?prompt=...&targetWords=...
 * 
 * Estimate cost for article generation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prompt = searchParams.get('prompt') || '';
    const targetWords = parseInt(searchParams.get('targetWords') || '600');

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt required' },
        { status: 400 }
      );
    }

    const estimatedCost = estimateGenerationCost(prompt.length, targetWords);

    return NextResponse.json({
      success: true,
      estimatedCost,
      promptLength: prompt.length,
      targetWords,
      note: 'Actual cost may vary based on generated content length'
    });

  } catch (error: any) {
    console.error('Cost Estimation Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}







