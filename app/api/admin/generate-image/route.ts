import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, article, style = 'realistic', size = '1024x1024' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Enhance prompt based on article context and style
    const enhancedPrompt = enhancePrompt(prompt, article, style);
    
    console.log(`🎨 Generating image with DALL-E: "${enhancedPrompt}"`);

    const openai = getOpenAIClient();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: size as "1024x1024" | "1792x1024" | "1024x1792",
      quality: "standard",
      style: style === 'natural' ? 'natural' : 'vivid'
    });

    const imageUrl = response.data?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error('No image generated');
    }

    // Create image object compatible with our system
    const generatedImage = {
      id: `dalle-${Date.now()}`,
      url: imageUrl,
      thumbnail: imageUrl, // DALL-E doesn't provide thumbnails, use full size
      fullSize: imageUrl,
      description: `AI generated image: ${prompt}`,
      author: 'DALL-E 3',
      authorUrl: 'https://openai.com/dall-e',
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      aspectRatio: (parseInt(size.split('x')[0]) / parseInt(size.split('x')[1])).toFixed(2),
      downloadUrl: imageUrl,
      source: 'openai',
      tags: extractTagsFromPrompt(prompt),
      color: '#000000', // Default color
      likes: 0,
      createdAt: new Date().toISOString(),
      prompt: enhancedPrompt,
      originalPrompt: prompt,
      style,
      model: 'dall-e-3'
    };

    console.log(`✅ Successfully generated image with DALL-E`);

    return NextResponse.json({
      success: true,
      image: generatedImage,
      usage: {
        prompt_tokens: enhancedPrompt.length,
        model: 'dall-e-3'
      }
    });

  } catch (error) {
    console.error('DALL-E generation error:', error);
    
    let errorMessage = 'Image generation failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// Helper function to enhance prompts based on article context
function enhancePrompt(prompt: string, article: any, style: string): string {
  let enhancedPrompt = prompt;

  // Add style modifiers
  const styleModifiers = {
    realistic: 'photorealistic, high quality, professional',
    artistic: 'artistic, creative, stylized',
    minimal: 'minimal, clean, simple design',
    vibrant: 'vibrant colors, energetic, dynamic',
    tech: 'modern, technological, futuristic, sleek'
  };

  const modifier = styleModifiers[style as keyof typeof styleModifiers] || styleModifiers.realistic;
  
  // Add context from article if provided
  if (article) {
    const category = article.category;
    const categoryContexts = {
      'ai': 'artificial intelligence, machine learning, technology',
      'apple': 'Apple products, iOS, modern design, premium',
      'tech': 'technology, innovation, modern, digital',
      'digital': 'digital transformation, modern, clean'
    };
    
    const context = categoryContexts[category as keyof typeof categoryContexts] || 'technology';
    enhancedPrompt = `${prompt}, ${context}, ${modifier}`;
  } else {
    enhancedPrompt = `${prompt}, ${modifier}`;
  }

  // Ensure prompt is not too long (DALL-E has limits)
  if (enhancedPrompt.length > 1000) {
    enhancedPrompt = enhancedPrompt.substring(0, 997) + '...';
  }

  return enhancedPrompt;
}

// Helper function to extract tags from prompt
function extractTagsFromPrompt(prompt: string): string[] {
  // Simple tag extraction based on common words
  const commonTags = [
    'technology', 'ai', 'artificial intelligence', 'machine learning',
    'apple', 'ios', 'iphone', 'ipad', 'mac',
    'digital', 'innovation', 'modern', 'futuristic',
    'business', 'startup', 'development', 'programming',
    'design', 'ui', 'ux', 'interface'
  ];

  const promptLower = prompt.toLowerCase();
  return commonTags.filter(tag => promptLower.includes(tag));
}

