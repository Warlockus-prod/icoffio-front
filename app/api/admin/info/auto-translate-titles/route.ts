/**
 * POST /api/admin/info/auto-translate-titles
 *
 * Batch-translate info_feeds.title → info_feeds.title_pl (and/or title_en) via OpenAI.
 *
 * v10.12.0: solves the user's original complaint — "IAB Polska shows in English
 * on PL locale" — by letting admin one-click fill missing localized titles for
 * all 121 feeds in a single ~$0.001 GPT call.
 *
 * Body (optional):
 *   { target: 'pl' | 'en' = 'pl', overwrite: false, onlyMissing: true }
 *
 * Response:
 *   { ok, updated, skipped, totalScanned, durationMs }
 *
 * Auth: admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { getPool } from '@/lib/pg-pool';
import { logError } from '@/lib/error-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface TranslateBody {
  target?: 'pl' | 'en';
  overwrite?: boolean;
  onlyMissing?: boolean;
}

const TARGET_COLUMN: Record<'pl' | 'en', 'title_pl' | 'title_en'> = {
  pl: 'title_pl',
  en: 'title_en',
};

const SOFT_LANG_NAME: Record<'pl' | 'en', string> = {
  pl: 'Polish',
  en: 'English',
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  let body: TranslateBody = {};
  try {
    body = (await request.json()) as TranslateBody;
  } catch { /* empty body OK */ }

  const target = body.target === 'en' ? 'en' : 'pl';
  const overwrite = body.overwrite === true;
  const onlyMissing = body.onlyMissing !== false; // default true
  const column = TARGET_COLUMN[target];

  const pool = getPool();
  const startedAt = Date.now();

  try {
    // 1. Fetch feeds that need translation
    const filterSql = overwrite
      ? '1=1'
      : onlyMissing
        ? `(${column} IS NULL OR ${column} = '' OR ${column} = title)`
        : `${column} IS NULL OR ${column} = ''`;

    const { rows: feeds } = await pool.query(
      `SELECT id, title, lang FROM info_feeds
        WHERE ${filterSql}
        ORDER BY id ASC`,
    );

    if (feeds.length === 0) {
      return NextResponse.json({
        ok: true, updated: 0, skipped: 0, totalScanned: 0,
        message: 'Nothing to translate — all feeds already have ' + column,
        durationMs: Date.now() - startedAt,
      });
    }

    // 2. Build one GPT prompt for the whole batch
    const numbered = feeds.map((f, i) => `${i + 1}. ${f.title}`).join('\n');
    const langName = SOFT_LANG_NAME[target];

    const prompt = `You are localizing RSS feed source names for a news aggregator UI.
Translate the following feed names to ${langName}. Rules:
- Keep BRAND NAMES unchanged (e.g. "BBC", "Bloomberg", "TechCrunch", "iXBT", "TASS", "RT").
- Translate descriptive nouns ("News", "Markets", "Politics", "Tech", "European Union" etc.).
- Preserve the case style and punctuation of the original.
- One-line output per item, prefixed with the same number and a period.
- Do NOT add explanations or commentary.
- If the name is ALREADY in ${langName}, return it as-is.

Input:
${numbered}

Output (numbered, one per line):`;

    // 3. Call OpenAI
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
        temperature: 0.1,
        max_tokens: Math.min(4000, feeds.length * 40),
        messages: [
          { role: 'system', content: 'You translate brand and feed names with surgical precision.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      await logError({
        level: 'error',
        source: 'auto-translate-titles',
        message: `OpenAI ${aiResp.status}`,
        metadata: { body: errText.slice(0, 400) },
      });
      return NextResponse.json({ ok: false, error: `OpenAI ${aiResp.status}` }, { status: 502 });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || '';

    // 4. Parse "N. translation" lines
    const translations = new Map<number, string>();
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*(\d+)\.\s*(.+?)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const t = m[2].trim();
        if (n >= 1 && n <= feeds.length && t) {
          translations.set(n - 1, t);
        }
      }
    }

    // 5. Bulk-update DB
    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < feeds.length; i++) {
      const f = feeds[i];
      const t = translations.get(i);
      if (!t) { skipped++; continue; }
      if (t === f.title && !overwrite) { skipped++; continue; }

      await pool.query(
        `UPDATE info_feeds SET ${column} = $1 WHERE id = $2`,
        [t.slice(0, 500), f.id],
      );
      updated++;
    }

    return NextResponse.json({
      ok: true,
      target,
      column,
      updated,
      skipped,
      totalScanned: feeds.length,
      durationMs: Date.now() - startedAt,
      modelUsed: model,
    });
  } catch (err: any) {
    await logError({
      level: 'error',
      source: 'auto-translate-titles',
      message: 'Handler crashed',
      error: err,
    });
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
