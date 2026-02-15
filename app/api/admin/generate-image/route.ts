import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getArticleImage, type ImageSource } from '@/lib/image-generation-service';

async function persistRemoteImage(imageUrl: string, title: string): Promise<string> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return imageUrl;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return imageUrl;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('jpeg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png';
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'ai-image';
    const fileName = `articles/ai/${Date.now()}-${safeTitle}.${extension}`;

    const blob = await put(fileName, Buffer.from(arrayBuffer), {
      access: 'public',
      contentType,
      addRandomSuffix: false
    });

    return blob.url;
  } catch (error) {
    console.warn('Failed to persist generated image, using original URL');
    return imageUrl;
  }
}

/**
 * API endpoint для генерации изображений статей
 * Поддерживает DALL-E 3, Unsplash и custom URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source = body?.source || 'unsplash';
    const title = (body?.title || body?.prompt || '').toString().trim();
    const excerpt = body?.excerpt;
    const category = body?.category;
    const customUrl = body?.customUrl;
    const quality = body?.quality || 'hd';
    const style = body?.style || 'natural';
    const size = body?.size || '1792x1024';

    // Валидация
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Article title or prompt is required' },
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

    const finalUrl =
      source === 'dalle' && result.url
        ? await persistRemoteImage(result.url, title)
        : result.url;

    const normalizedSource = source === 'dalle' ? 'ai' : source;
    const image = finalUrl
      ? {
          id: `${normalizedSource}-${Date.now()}`,
          url: finalUrl,
          thumbnail: finalUrl,
          source: normalizedSource,
          prompt: result.revisedPrompt || title,
        }
      : null;

    return NextResponse.json({
      success: true,
      url: finalUrl,
      imageUrl: finalUrl, // legacy compatibility
      image, // legacy compatibility for older admin widgets
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
