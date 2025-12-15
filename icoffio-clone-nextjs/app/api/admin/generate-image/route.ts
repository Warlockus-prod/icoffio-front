import { NextRequest, NextResponse } from 'next/server';
import { getArticleImage, type ImageSource } from '@/lib/image-generation-service';

/**
 * API endpoint для генерации изображений статей
 * Поддерживает DALL-E 3, Unsplash и custom URLs
 */
export async function POST(request: NextRequest) {
  try {
    const {
      source = 'unsplash',
      title,
      excerpt,
      category,
      customUrl,
      quality = 'hd',
      style = 'natural',
      size = '1792x1024',
    } = await request.json();

    // Валидация
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Article title is required' },
        { status: 400 }
      );
    }

    if (!['dalle', 'unsplash', 'custom'].includes(source)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image source' },
        { status: 400 }
      );
    }

    if (source === 'custom' && !customUrl) {
      return NextResponse.json(
        { success: false, error: 'Custom URL is required when using custom source' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating image from ${source} for article: "${title}"`);

    // Генерируем изображение через unified service
    const result = await getArticleImage(
      source as ImageSource,
      {
        title,
        excerpt,
        category,
        quality: quality as 'standard' | 'hd',
        style: style as 'natural' | 'vivid',
        size: size as '1024x1024' | '1792x1024' | '1024x1792',
      },
      customUrl
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ Image generated successfully from ${source}`);
    if (result.cost && result.cost > 0) {
      console.log(`💰 Cost: $${result.cost.toFixed(2)}`);
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      cost: result.cost,
      revisedPrompt: result.revisedPrompt,
      source,
    });

  } catch (error) {
    console.error('Image generation API error:', error);

    let errorMessage = 'Failed to generate image';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
