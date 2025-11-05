/**
 * 🎨 IMAGE OPTIONS API ENDPOINT
 * 
 * POST /api/articles/image-options
 * Генерирует варианты изображений для статьи (3x Unsplash + 2x AI)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateImageOptions, regenerateImageOptions } from '@/lib/image-options-generator';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 секунд для генерации изображений

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, title, category, excerpt, regenerate = false } = body;

    // Validation
    if (!articleId || !title || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, title, category' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating image options for article: ${title}`);
    console.log(`   Category: ${category}`);
    console.log(`   Regenerate: ${regenerate}`);

    // Generate image options
    const imageOptions = regenerate
      ? await regenerateImageOptions({ title, category, excerpt })
      : await generateImageOptions({ title, category, excerpt });

    const totalOptions = imageOptions.unsplash.length + imageOptions.aiGenerated.length;
    console.log(`✅ Generated ${totalOptions} image options (${imageOptions.unsplash.length} Unsplash + ${imageOptions.aiGenerated.length} AI)`);

    return NextResponse.json(imageOptions);

  } catch (error) {
    console.error('❌ Error generating image options:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate image options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint для проверки статуса
export async function GET() {
  return NextResponse.json({
    service: 'Image Options Generator',
    status: 'operational',
    capabilities: {
      unsplash: !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY,
      ai: !!process.env.OPENAI_API_KEY
    }
  });
}


