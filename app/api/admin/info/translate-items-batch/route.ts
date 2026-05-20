/**
 * POST /api/admin/info/translate-items-batch
 *
 * Batch-translate info_feed_items.title → title_pl / title_en via OpenAI.
 *
 * v10.14.0: enables real localization of news headlines for non-source-language
 * users. Designed to be cheap and admin-controlled — NOT auto-running on every
 * RSS poll (cost grows with feed velocity).
 *
 * Body (optional):
 *   {
 *     target: 'pl' | 'en' = 'pl',
 *     days: number = 14,           // only items newer than N days
 *     limit: number = 200,         // hard cap per call (cost guard)
 *     onlyMissing: boolean = true, // skip rows already translated
 *   }
 *
 * Cost guidance:
 *   ~$0.0002 per item via gpt-4.1-mini. limit=200 → ~$0.04 per call.
 *
 * Auth: admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { getPool } from '@/lib/pg-pool';
import { logError } from '@/lib/error-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface Body {
  target?: 'pl' | 'en';
  days?: number;
  limit?: number;
  onlyMissing?: boolean;
}

const TARGET_COLUMN = { pl: 'title_pl', en: 'title_en' } as const;
const LANG_NAME = { pl: 'Polish', en: 'English' } as const;

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch { /* empty body ok */ }

  const target = body.target === 'en' ? 'en' : 'pl';
  const days = Math.min(Math.max(body.days ?? 14, 1), 90);
  // v10.14.0 hotfix: default + cap reduced to 50 to fit inside Next.js 90s maxDuration
  // when GPT runs slow. Admin can pass `limit` up to 200; over that the cron worker
  // should be used (future feature).
  const limit = Math.min(Math.max(body.limit ?? 50, 1), 200);
  const onlyMissing = body.onlyMissing !== false;
  const column = TARGET_COLUMN[target];

  const pool = getPool();
  const startedAt = Date.now();

  try {
    // Find candidates: recent items missing the target translation
    const whereClause = onlyMissing ? `(${column} IS NULL OR ${column} = '')` : '1=1';
    const { rows: items } = await pool.query(
      `SELECT id, title
         FROM info_feed_items
        WHERE ${whereClause}
          AND created_at >= NOW() - ($1 || ' days')::interval
        ORDER BY published_at DESC NULLS LAST
        LIMIT $2`,
      [String(days), limit],
    );

    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        target,
        column,
        updated: 0,
        skipped: 0,
        totalScanned: 0,
        message: `No items to translate (no missing ${column} in last ${days} days)`,
        durationMs: Date.now() - startedAt,
      });
    }

    // GPT batch prompt
    const numbered = items
      .map((it, i) => `${i + 1}. ${it.title.slice(0, 300)}`)
      .join('\n');
    const langName = LANG_NAME[target];

    const prompt = `Translate EVERY news headline below to ${langName}.
The input can be in English, Russian, Polish, Ukrainian, German, or any other language —
your output MUST be in ${langName}. Do NOT copy the input verbatim.

Rules:
- Translate the meaning into idiomatic ${langName}.
- Preserve PROPER NOUNS: brand names, product names, place names, person names.
- Keep punctuation style (no extra periods; keep "—", ":", "?", quotes).
- Output one line per input, prefixed with the same number and a period.
- Do NOT add commentary, explanations, source-language preservation notes, or any extra text.
- If the input is somehow malformed/empty, still emit a numbered line with the best you can do.

Examples (target language: ${langName}):
  Input:  "Apple launches new iPhone with AI features"
  Output (PL): "Apple wprowadza nowego iPhone'a z funkcjami AI"
  Output (EN): "Apple launches new iPhone with AI features"

  Input:  "Россия объявила о санкциях"
  Output (PL): "Rosja ogłosiła sankcje"
  Output (EN): "Russia announced sanctions"

Headlines to translate:
${numbered}

Now produce the numbered ${langName} translations:`;

    const openaiBase = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4.1-mini';

    const aiResp = await fetch(`${openaiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: Math.min(8000, items.length * 80),
        messages: [
          { role: 'system', content: 'You translate news headlines with editorial precision.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      await logError({
        level: 'error',
        source: 'translate-items-batch',
        message: `OpenAI ${aiResp.status}`,
        metadata: { body: errText.slice(0, 400), target, count: items.length },
      });
      return NextResponse.json({ ok: false, error: `OpenAI ${aiResp.status}` }, { status: 502 });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || '';

    // Parse numbered output
    const translations = new Map<number, string>();
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*(\d+)\.\s*(.+?)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const t = m[2].trim();
        if (n >= 1 && n <= items.length && t) {
          translations.set(n - 1, t);
        }
      }
    }

    // Apply updates. v10.14.0 hotfix: if GPT echoed the source unchanged (lazy
    // response), skip the row so the next batch run can try again with a tighter prompt.
    let updated = 0;
    let skipped = 0;
    let lazyEchoes = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const t = translations.get(i);
      if (!t) { skipped++; continue; }
      if (t.trim() === it.title.trim()) { lazyEchoes++; skipped++; continue; }

      await pool.query(
        `UPDATE info_feed_items SET ${column} = $1 WHERE id = $2`,
        [t.slice(0, 1000), it.id],
      );
      updated++;
    }

    return NextResponse.json({
      ok: true,
      target,
      column,
      updated,
      skipped,
      lazyEchoes,
      totalScanned: items.length,
      days,
      limit,
      durationMs: Date.now() - startedAt,
      modelUsed: model,
      // approx token-cost feedback for admin UI
      approxCostUsd: ((items.length * 600) / 1_000_000 * 0.15 + (items.length * 80) / 1_000_000 * 0.60).toFixed(4),
    });
  } catch (err: any) {
    await logError({
      level: 'error',
      source: 'translate-items-batch',
      message: 'Handler crashed',
      error: err,
    });
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
