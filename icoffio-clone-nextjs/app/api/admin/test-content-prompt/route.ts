/**
 * TEST CONTENT PROMPT API v7.8.1
 * 
 * API для тестирования промптов обработки контента
 * 
 * @version 7.8.1
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/test-content-prompt
 * 
 * Тестирует промпт на примере текста
 */
export async function POST(request: NextRequest) {
  try {
    const { text, systemPrompt, style } = await request.json();

    if (!text || !systemPrompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: text, systemPrompt' },
        { status: 400 }
      );
    }

    // Для стиля "as-is" возвращаем текст как есть
    if (style === 'as-is') {
      return NextResponse.json({
        success: true,
        processedText: text,
        style: 'as-is',
        note: 'Text returned as-is without modifications'
      });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log('[TestContentPrompt] Processing text with style:', style);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const processedText = completion.choices[0]?.message?.content;

    if (!processedText) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('[TestContentPrompt] ✅ Text processed successfully');

    return NextResponse.json({
      success: true,
      processedText,
      style,
      tokensUsed: completion.usage?.total_tokens || 0
    });

  } catch (error: any) {
    console.error('[TestContentPrompt] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process text'
      },
      { status: 500 }
    );
  }
}

