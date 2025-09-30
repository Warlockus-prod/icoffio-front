import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content, targetLanguage, sourceLanguage = 'ru' } = await request.json();

    if (!content || !targetLanguage) {
      return NextResponse.json(
        { error: 'Content and target language are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Language mapping
    const languageNames = {
      'ru': 'Russian',
      'en': 'English', 
      'pl': 'Polish'
    };

    const sourceLang = languageNames[sourceLanguage as keyof typeof languageNames] || 'Russian';
    const targetLang = languageNames[targetLanguage as keyof typeof languageNames];

    if (!targetLang) {
      return NextResponse.json(
        { error: 'Unsupported target language' },
        { status: 400 }
      );
    }

    // Create translation prompts
    const systemPrompt = `You are a professional translator and tech journalist specializing in technology, AI, Apple, and digital trends. 

Your task is to translate articles from ${sourceLang} to ${targetLang} while:
1. Maintaining the original meaning and technical accuracy
2. Adapting the writing style to be natural in the target language
3. Preserving technical terms appropriately
4. Keeping the professional journalistic tone
5. Ensuring the translation flows naturally for native speakers

Return only the translated content in JSON format with exactly these fields:
- title: translated title
- content: translated full content 
- excerpt: translated excerpt/summary`;

    const userPrompt = `Please translate this article to ${targetLang}:

TITLE:
${content.title}

EXCERPT: 
${content.excerpt}

CONTENT:
${content.content}

Return the translation in JSON format.`;

    console.log(`🌍 Translating article to ${targetLang}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const translatedContent = completion.choices[0]?.message?.content;
    
    if (!translatedContent) {
      throw new Error('No translation received from OpenAI');
    }

    // Try to parse JSON response
    let translation;
    try {
      translation = JSON.parse(translatedContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract content manually
      console.log('JSON parsing failed, attempting manual extraction...');
      
      // Fallback: use the entire response as content if JSON parsing fails
      translation = {
        title: `[Translation] ${content.title}`,
        content: translatedContent,
        excerpt: translatedContent.substring(0, 160) + '...'
      };
    }

    // Validate translation structure
    if (!translation.title || !translation.content || !translation.excerpt) {
      throw new Error('Invalid translation structure received');
    }

    console.log(`✅ Successfully translated to ${targetLang}`);

    return NextResponse.json({
      success: true,
      translation,
      targetLanguage,
      sourceLanguage,
      timestamp: new Date().toISOString(),
      usage: completion.usage
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    let errorMessage = 'Translation failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}