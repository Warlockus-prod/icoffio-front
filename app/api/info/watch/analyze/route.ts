import { NextRequest, NextResponse } from 'next/server';
import { deduplicateItems, analyzeSentiment, updateQualityScores } from '@/lib/info/watch-search';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'dedup') {
      const count = await deduplicateItems();
      return NextResponse.json({ ok: true, deduplicated: count });
    }

    if (action === 'sentiment') {
      const count = await analyzeSentiment(body.batch_size || 30);
      return NextResponse.json({ ok: true, analyzed: count });
    }

    if (action === 'quality') {
      await updateQualityScores();
      return NextResponse.json({ ok: true });
    }

    // Run all
    const deduped = await deduplicateItems();
    const sentiment = await analyzeSentiment(50);
    await updateQualityScores();

    return NextResponse.json({ ok: true, deduplicated: deduped, sentiment_analyzed: sentiment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
