import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || 'technology';
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '12');
  const orientation = searchParams.get('orientation') || 'landscape';

  if (!UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({
      success: false,
      error: 'Unsplash API key not configured',
      images: []
    });
  }

  try {
    console.log(`🔍 Searching Unsplash for: "${query}"`);

    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${orientation}&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    
    const images = data.results?.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnail: photo.urls.small,
      fullSize: photo.urls.full,
      description: photo.alt_description || photo.description || 'Image from Unsplash',
      author: photo.user.name,
      authorUrl: photo.user.links.html,
      width: photo.width,
      height: photo.height,
      aspectRatio: (photo.width / photo.height).toFixed(2),
      downloadUrl: photo.links.download,
      source: 'unsplash',
      tags: photo.tags?.map((tag: any) => tag.title) || [],
      color: photo.color,
      likes: photo.likes,
      createdAt: photo.created_at
    })) || [];

    console.log(`✅ Found ${images.length} images from Unsplash`);

    return NextResponse.json({
      success: true,
      images,
      total: data.total || 0,
      totalPages: data.total_pages || 0,
      currentPage: page,
      query,
      source: 'unsplash'
    });

  } catch (error) {
    console.error('Unsplash search error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search images',
      images: []
    }, { status: 500 });
  }
}





