import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { text, target_lang } = await req.json();
    if (!text || !target_lang) {
      return NextResponse.json({ error: 'text and target_lang required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    const langName: Record<string, string> = { ru: 'Russian', pl: 'Polish', en: 'English' };
    const targetName = langName[target_lang] || target_lang;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: `Translate the following text to ${targetName}. Return only the translated text, nothing else.` },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `OpenAI error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ translated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
